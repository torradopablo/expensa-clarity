import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/ui/logo";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2 group">
          <Logo className="w-10 h-10 group-hover:rotate-12 transition-transform duration-500" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            ExpensaCheck
          </span>
        </Link>
      </div>
    </header>
  );
};

const Privacidad = () => {
  const lastUpdated = "11 de enero de 2026";

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container max-w-4xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">Política de Privacidad</h1>
          <p className="text-muted-foreground mb-8">Última actualización: {lastUpdated}</p>

          <Card variant="glass" className="mb-6">
            <CardContent className="p-6 md:p-8 prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">1. Introducción</h2>
                <p className="text-muted-foreground mb-4">
                  En ExpensaCheck ("nosotros", "nuestro", "la Plataforma") nos comprometemos a proteger su privacidad
                  y datos personales. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos,
                  protegemos y compartimos su información cuando utiliza nuestro servicio de análisis de expensas.
                </p>
                <p className="text-muted-foreground">
                  Esta política cumple con la Ley de Protección de Datos Personales N° 25.326 de la República Argentina,
                  su Decreto Reglamentario N° 1558/2001, y las disposiciones de la Agencia de Acceso a la Información
                  Pública (AAIP).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">2. Responsable del Tratamiento</h2>
                <p className="text-muted-foreground mb-4">
                  El responsable del tratamiento de sus datos personales es ExpensaCheck. Para ejercer sus derechos
                  o realizar consultas sobre el tratamiento de sus datos, puede contactarnos a través de nuestra{" "}
                  <Link to="/contacto" className="text-primary hover:underline">página de contacto</Link>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">3. Datos que Recopilamos</h2>

                <h3 className="text-lg font-medium mb-3 mt-6">3.1 Datos proporcionados directamente por usted</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Datos de registro:</strong> Dirección de correo electrónico, nombre (opcional), contraseña encriptada</li>
                  <li><strong>Documentos de expensas:</strong> Archivos PDF o imágenes que usted carga para su análisis</li>
                  <li><strong>Datos de contacto:</strong> Información proporcionada al comunicarse con nosotros</li>
                  <li><strong>Notas y anotaciones:</strong> Comentarios que agrega a sus análisis</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 mt-6">3.2 Datos recopilados automáticamente</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Datos de uso:</strong> Fecha y hora de acceso, páginas visitadas, acciones realizadas</li>
                  <li><strong>Datos técnicos:</strong> Dirección IP, tipo de navegador, sistema operativo, dispositivo</li>
                  <li><strong>Cookies:</strong> Identificadores de sesión y preferencias (ver sección 8)</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 mt-6">3.3 Datos derivados del procesamiento</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Análisis generados:</strong> Resultados del procesamiento de sus documentos de expensas</li>
                  <li><strong>Datos extraídos:</strong> Montos, categorías, períodos y otros datos identificados en sus documentos</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">4. Finalidad del Tratamiento</h2>
                <p className="text-muted-foreground mb-4">
                  Utilizamos sus datos personales para las siguientes finalidades:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Prestación del servicio:</strong> Procesar y analizar sus documentos de expensas</li>
                  <li><strong>Gestión de cuenta:</strong> Crear y administrar su cuenta de usuario</li>
                  <li><strong>Comunicaciones:</strong> Enviar notificaciones sobre el servicio y responder consultas</li>
                  <li><strong>Mejora del servicio:</strong> Analizar patrones de uso para mejorar la plataforma</li>
                  <li><strong>Seguridad:</strong> Detectar y prevenir fraudes, abusos y actividades no autorizadas</li>
                  <li><strong>Cumplimiento legal:</strong> Cumplir con obligaciones legales y regulatorias aplicables</li>
                  <li><strong>Procesamiento de pagos:</strong> Gestionar transacciones a través de procesadores de pago</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">5. Base Legal del Tratamiento</h2>
                <p className="text-muted-foreground mb-4">
                  El tratamiento de sus datos personales se basa en:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Consentimiento:</strong> Al crear su cuenta y utilizar el servicio, usted consiente el tratamiento de sus datos conforme a esta política</li>
                  <li><strong>Ejecución contractual:</strong> El tratamiento es necesario para prestar el servicio que usted ha contratado</li>
                  <li><strong>Interés legítimo:</strong> Para mejorar el servicio y garantizar su seguridad</li>
                  <li><strong>Obligación legal:</strong> Cuando sea requerido por ley o autoridad competente</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">6. Almacenamiento y Seguridad</h2>

                <h3 className="text-lg font-medium mb-3 mt-6">6.1 Ubicación de los datos</h3>
                <p className="text-muted-foreground mb-4">
                  Sus datos se almacenan en servidores seguros proporcionados por proveedores de infraestructura en la
                  nube de reconocida reputación. Los servidores pueden estar ubicados fuera de Argentina, en jurisdicciones
                  que cuentan con niveles de protección de datos adecuados o mediante cláusulas contractuales estándar.
                </p>

                <h3 className="text-lg font-medium mb-3 mt-6">6.2 Medidas de seguridad</h3>
                <p className="text-muted-foreground mb-4">Implementamos medidas técnicas y organizativas apropiadas, incluyendo:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Encriptación de datos en tránsito (HTTPS/TLS) y en reposo</li>
                  <li>Contraseñas almacenadas mediante hash seguro</li>
                  <li>Control de acceso basado en roles</li>
                  <li>Monitoreo y auditoría de accesos</li>
                  <li>Respaldos periódicos de información</li>
                  <li>Políticas de seguridad de la información</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 mt-6">6.3 Retención de datos</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Datos de cuenta:</strong> Mientras su cuenta esté activa</li>
                  <li><strong>Documentos cargados:</strong> Por el tiempo necesario para el procesamiento, luego se eliminan automáticamente</li>
                  <li><strong>Análisis generados:</strong> Almacenados mientras mantenga su cuenta activa</li>
                  <li><strong>Datos de pago:</strong> Según requerimientos legales y fiscales (mínimo 10 años)</li>
                  <li><strong>Logs técnicos:</strong> Máximo 90 días</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">7. Compartición de Datos</h2>
                <p className="text-muted-foreground mb-4">
                  <strong>No vendemos, alquilamos ni comercializamos sus datos personales.</strong> Podemos compartir
                  información en los siguientes casos limitados:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Proveedores de servicios:</strong> Procesadores de pago (MercadoPago), servicios de infraestructura
                    en la nube, servicios de análisis, bajo acuerdos de confidencialidad</li>
                  <li><strong>Servicios de IA:</strong> Para procesar documentos utilizamos servicios de inteligencia artificial.
                    Los documentos se procesan de forma segura y no se utilizan para entrenar modelos de terceros</li>
                  <li><strong>Requerimientos legales:</strong> Cuando sea requerido por ley, orden judicial o autoridad competente</li>
                  <li><strong>Protección de derechos:</strong> Para proteger nuestros derechos, seguridad o propiedad</li>
                  <li><strong>Transferencia de negocio:</strong> En caso de fusión, adquisición o venta de activos, con notificación previa</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">8. Cookies y Tecnologías Similares</h2>
                <p className="text-muted-foreground mb-4">
                  Utilizamos cookies y tecnologías similares para:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento del servicio (autenticación, seguridad)</li>
                  <li><strong>Cookies de preferencias:</strong> Recordar sus configuraciones y preferencias</li>
                  <li><strong>Cookies analíticas:</strong> Entender cómo utiliza el servicio para mejorarlo</li>
                </ul>
                <p className="text-muted-foreground">
                  Puede gestionar las cookies a través de la configuración de su navegador. Tenga en cuenta que deshabilitar
                  ciertas cookies puede afectar la funcionalidad del servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">9. Sus Derechos</h2>
                <p className="text-muted-foreground mb-4">
                  De acuerdo con la Ley N° 25.326, usted tiene los siguientes derechos:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Derecho de acceso:</strong> Solicitar información sobre los datos personales que tenemos sobre usted</li>
                  <li><strong>Derecho de rectificación:</strong> Corregir datos inexactos o incompletos</li>
                  <li><strong>Derecho de supresión:</strong> Solicitar la eliminación de sus datos personales</li>
                  <li><strong>Derecho de oposición:</strong> Oponerse al tratamiento de sus datos en ciertas circunstancias</li>
                  <li><strong>Derecho de portabilidad:</strong> Recibir sus datos en un formato estructurado y de uso común</li>
                  <li><strong>Derecho de información:</strong> Conocer la existencia de bases de datos que contengan sus datos</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  Para ejercer estos derechos, contáctenos a través de nuestra{" "}
                  <Link to="/contacto" className="text-primary hover:underline">página de contacto</Link>.
                  Responderemos a su solicitud dentro de los 10 días hábiles establecidos por ley.
                </p>
                <p className="text-muted-foreground">
                  <strong>Nota:</strong> La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control
                  de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes
                  resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección
                  de datos personales.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">10. Datos Sensibles</h2>
                <p className="text-muted-foreground">
                  No recopilamos intencionalmente datos sensibles según la definición de la Ley N° 25.326 (datos que
                  revelen origen racial y étnico, opiniones políticas, convicciones religiosas, filosóficas o morales,
                  afiliación sindical, información referente a la salud o a la vida sexual). Si sus documentos de
                  expensas contienen accidentalmente este tipo de información, será procesada únicamente para extraer
                  datos financieros relevantes y no será utilizada para ningún otro fin.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">11. Menores de Edad</h2>
                <p className="text-muted-foreground">
                  El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente información de
                  menores. Si detectamos que hemos recopilado datos de un menor sin consentimiento parental verificable,
                  tomaremos medidas para eliminar dicha información.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">12. Transferencias Internacionales</h2>
                <p className="text-muted-foreground">
                  Dado que utilizamos proveedores de servicios en la nube, sus datos pueden ser transferidos y
                  almacenados fuera de Argentina. En estos casos, nos aseguramos de que existan salvaguardas
                  apropiadas, como cláusulas contractuales estándar aprobadas, para proteger sus datos conforme
                  a la legislación argentina.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">13. Cambios a esta Política</h2>
                <p className="text-muted-foreground">
                  Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos sobre cambios
                  materiales mediante un aviso en el Servicio o por correo electrónico. Le recomendamos revisar
                  esta política regularmente. La fecha de "última actualización" al inicio indica cuándo se
                  realizó la última modificación.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">14. Contacto</h2>
                <p className="text-muted-foreground">
                  Si tiene preguntas, inquietudes o desea ejercer sus derechos respecto a esta Política de
                  Privacidad o el tratamiento de sus datos personales, puede contactarnos a través de nuestra{" "}
                  <Link to="/contacto" className="text-primary hover:underline">página de contacto</Link>.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Privacidad;
