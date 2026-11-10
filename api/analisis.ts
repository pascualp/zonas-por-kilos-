// Función de servidor de Vercel: genera el análisis con Gemini.
// La clave se configura en Vercel (Settings > Environment Variables > GEMINI_API_KEY)
// y nunca llega al navegador. El texto que se envía a Gemini se construye aquí,
// a partir de números, para que nadie pueda usar esta dirección como acceso libre a la IA.

interface ZonaResumen { nombre: string; kilos: number; pedidos: number }
interface DiaResumen { dia: string; kilos: number }
interface Resumen {
  periodo: string;
  totalKilos: number;
  totalPedidos: number;
  zonas: ZonaResumen[];
  dias: DiaResumen[];
}

const MODELO = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

const texto = (v: unknown, max: number) => String(v ?? '').replace(/[\r\n`]/g, ' ').slice(0, max);
const numero = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

function validar(body: any): Resumen | null {
  if (!body || typeof body !== 'object') return null;
  if (!Array.isArray(body.zonas) || !Array.isArray(body.dias)) return null;
  return {
    periodo: texto(body.periodo, 40),
    totalKilos: numero(body.totalKilos),
    totalPedidos: numero(body.totalPedidos),
    zonas: body.zonas.slice(0, 10).map((z: any) => ({
      nombre: texto(z?.nombre, 40),
      kilos: numero(z?.kilos),
      pedidos: numero(z?.pedidos),
    })),
    dias: body.dias.slice(0, 7).map((d: any) => ({ dia: texto(d?.dia, 12), kilos: numero(d?.kilos) })),
  };
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export async function POST(request: Request): Promise<Response> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) {
    return json(503, { error: 'La IA no está configurada. Falta añadir GEMINI_API_KEY en Vercel.' });
  }

  const crudo = await request.text();
  if (crudo.length > 10_000) return json(413, { error: 'Datos demasiado grandes.' });

  let resumen: Resumen | null = null;
  try {
    resumen = validar(JSON.parse(crudo));
  } catch {
    resumen = null;
  }
  if (!resumen || resumen.zonas.length === 0) {
    return json(400, { error: 'No hay datos suficientes para analizar.' });
  }

  const es = (n: number) => n.toLocaleString('es-ES');
  const prompt = `Analiza los siguientes datos de logística de una empresa de distribución de frutas y verduras en Mallorca:
- Periodo: ${resumen.periodo}
- Total kilos: ${es(resumen.totalKilos)} kg
- Total pedidos: ${es(resumen.totalPedidos)}
- Zonas con más kilos: ${resumen.zonas.map(z => `${z.nombre} (${es(z.kilos)} kg, ${es(z.pedidos)} pedidos)`).join(', ')}
- Kilos por día de la semana: ${resumen.dias.map(d => `${d.dia}: ${es(d.kilos)} kg`).join(', ')}

Por favor, proporciona:
1. Un resumen ejecutivo rápido.
2. La zona más crítica o con más peso.
3. Una recomendación logística para rutas o personal según los días de más carga.
4. Una tendencia que observes.

Responde en español, con tono profesional pero cercano, en formato markdown y sin inventar datos que no aparezcan arriba.`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODELO)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      },
    );
    if (!r.ok) {
      console.error('Gemini respondió', r.status, (await r.text()).slice(0, 500));
      return json(502, { error: 'La IA no ha respondido correctamente. Inténtalo de nuevo en unos minutos.' });
    }
    const data: any = await r.json();
    const salida = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? '')
      .join('')
      .trim();
    return json(200, { texto: salida || 'No se pudo generar el análisis.' });
  } catch (e) {
    console.error('Error llamando a Gemini', e);
    return json(502, { error: 'No se pudo conectar con la IA.' });
  }
}
