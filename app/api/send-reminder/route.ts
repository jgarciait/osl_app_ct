import { NextResponse } from "next/server"
import { Resend } from "resend"

// Inicializar Resend con la clave API
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    // Obtener los datos de la petición del cuerpo de la solicitud
    const {
      asesorEmail,
      asesorNombre,
      num_peticion,
      clasificacionNombre,
      legislador,
      temaNombre,
      estatusNombre,
      fecha_asignacion,
      fecha_limite,
      detalles,
    } = await request.json()

    // Verificar que tenemos un correo electrónico
    if (!asesorEmail) {
      return NextResponse.json({ error: "No se proporcionó un correo electrónico válido" }, { status: 400 })
    }

    // Crear el asunto del correo
    const subject = `RECORDATORIO: Petición pendiente #${num_peticion || "Sin número"} - ${clasificacionNombre || "Sin clasificación"}`

    // Actualizar la plantilla HTML del correo con el logo y nombre correctos

    // Reemplazar la URL del logo y el nombre de la organización en el cuerpo HTML
    const htmlBody = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Petición Pendiente</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .logo {
        max-width: 150px;
        margin-bottom: 15px;
      }
      .content {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      h2 {
        color: #1a365d;
        margin-top: 0;
      }
      ul {
        padding-left: 20px;
      }
      li {
        margin-bottom: 8px;
      }
      .footer {
        font-size: 12px;
        color: #666;
        text-align: center;
        margin-top: 30px;
        border-top: 1px solid #eee;
        padding-top: 15px;
      }
      .strong {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="https://static.wixstatic.com/media/5be21a_136547e15b304e479c7c1d026166d5e9~mv2.png/v1/fill/w_182,h_182,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Logo%20OSL%20copy-01.png" alt="Logo OSL" class="logo">
      <h2>Oficina de Estudios Legislativos y Consultoría Técnica</h2>
    </div>
    
    <div class="content">
      <p>Estimado/a ${asesorNombre},</p>
      
      <p>Se le recuerda que tiene una petición pendiente con los siguientes detalles:</p>
      
      <ul>
        <li><span class="strong">Número:</span> ${num_peticion || "No asignado"}</li>
        <li><span class="strong">Clasificación:</span> ${clasificacionNombre || "No asignada"}</li>
        <li><span class="strong">Legislador:</span> ${legislador || "No asignado"}</li>
        <li><span class="strong">Tema:</span> ${temaNombre || "No asignado"}</li>
        <li><span class="strong">Estatus:</span> ${estatusNombre || "No asignado"}</li>
        <li><span class="strong">Fecha Asignación:</span> ${fecha_asignacion ? new Date(fecha_asignacion).toLocaleDateString() : "No asignada"}</li>
        <li><span class="strong">Fecha Límite:</span> ${fecha_limite ? new Date(fecha_limite).toLocaleDateString() : "No asignada"}</li>
      </ul>
      
      ${detalles ? `<p><span class="strong">Detalles:</span> ${detalles}</p>` : ""}
      
      <p>Por favor, atienda esta petición a la brevedad posible.</p>
    </div>
    
    <div class="footer">
      <p>Este correo fue enviado automáticamente desde el sistema de gestión de la Oficina de Estudios Legislativos y Consultoría Técnica.</p>
      <p>© ${new Date().getFullYear()} Oficina de Estudios Legislativos y Consultoría Técnica. Todos los derechos reservados.</p>
    </div>
  </body>
  </html>
`

    // Enviar el correo usando el dominio aqplatform.app
    const { data, error } = await resend.emails.send({
      from: "notificaciones@aqplatform.app",
      to: asesorEmail,
      subject: subject,
      html: htmlBody,
    })

    if (error) {
      console.error("Error al enviar correo:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Recordatorio enviado a ${asesorNombre} (${asesorEmail})`,
      data,
    })
  } catch (error: any) {
    console.error("Error en la ruta de API:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
