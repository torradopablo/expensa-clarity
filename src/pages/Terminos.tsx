import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/ui/logo";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-xl font-semibold">ExpensaCheck</span>
        </Link>
      </div>
    </header>
  );
};

const Terminos = () => {
  const lastUpdated = "11 de enero de 2026";

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">Términos y Condiciones de Uso</h1>
          <p className="text-muted-foreground mb-8">Última actualización: {lastUpdated}</p>

          <Card variant="glass" className="mb-6">
            <CardContent className="p-6 md:p-8 prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">1. Aceptación de los Términos</h2>
                <p className="text-muted-foreground mb-4">
                  Al acceder y utilizar ExpensaCheck ("el Servicio", "la Plataforma", "nosotros"), usted acepta estar
                  legalmente obligado por estos Términos y Condiciones de Uso ("Términos"). Si no está de acuerdo con
                  alguna parte de estos Términos, no debe utilizar el Servicio.
                </p>
                <p className="text-muted-foreground">
                  Estos Términos constituyen un acuerdo legal vinculante entre usted ("Usuario", "usted") y ExpensaCheck.
                  Nos reservamos el derecho de modificar estos Términos en cualquier momento, notificando a los usuarios
                  a través de la plataforma o por correo electrónico.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">2. Descripción del Servicio</h2>
                <p className="text-muted-foreground mb-4">
                  ExpensaCheck es una herramienta de análisis de expensas de consorcios que permite a los usuarios:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Cargar y procesar documentos de expensas en formato PDF</li>
                  <li>Obtener un análisis detallado de los gastos por categoría</li>
                  <li>Comparar gastos entre períodos</li>
                  <li>Identificar variaciones inusuales o puntos de atención</li>
                  <li>Generar reportes descargables en formato PDF</li>
                  <li>Almacenar historial de análisis</li>
                </ul>
                <p className="text-muted-foreground">
                  <strong>Importante:</strong> ExpensaCheck es una herramienta informativa y de asistencia. Los análisis
                  proporcionados no constituyen asesoramiento legal, contable o financiero profesional. Las interpretaciones
                  y recomendaciones son orientativas y no reemplazan la consulta con profesionales matriculados.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">3. Registro y Cuenta de Usuario</h2>
                <p className="text-muted-foreground mb-4">
                  Para utilizar ciertas funcionalidades del Servicio, debe crear una cuenta proporcionando información
                  veraz, actualizada y completa. Usted es responsable de:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                  <li>Todas las actividades que ocurran bajo su cuenta</li>
                  <li>Notificarnos inmediatamente ante cualquier uso no autorizado de su cuenta</li>
                  <li>No compartir su cuenta con terceros</li>
                  <li>Proporcionar información veraz y actualizada</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">4. Uso Aceptable del Servicio</h2>
                <p className="text-muted-foreground mb-4">
                  Al utilizar ExpensaCheck, usted se compromete a:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Utilizar el Servicio únicamente para fines legales y autorizados</li>
                  <li>No cargar documentos que no sean de su propiedad o para los cuales no tenga autorización</li>
                  <li>No intentar acceder a cuentas o datos de otros usuarios</li>
                  <li>No utilizar el Servicio para actividades fraudulentas o ilegales</li>
                  <li>No interferir con el funcionamiento normal de la plataforma</li>
                  <li>No realizar ingeniería inversa o intentar acceder al código fuente</li>
                  <li>No utilizar sistemas automatizados para acceder al Servicio sin autorización</li>
                </ul>
                <p className="text-muted-foreground">
                  Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos de uso aceptable.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">5. Propiedad Intelectual</h2>
                <p className="text-muted-foreground mb-4">
                  Todo el contenido, diseño, código, algoritmos, logos, marcas y demás elementos del Servicio son
                  propiedad exclusiva de ExpensaCheck o sus licenciantes y están protegidos por las leyes de propiedad
                  intelectual aplicables.
                </p>
                <p className="text-muted-foreground">
                  Los documentos que usted carga mantienen su propiedad original. Al cargar contenido, nos otorga una
                  licencia limitada, no exclusiva y revocable para procesar dicho contenido únicamente con el fin de
                  proporcionar el Servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">6. Pagos y Facturación</h2>
                <p className="text-muted-foreground mb-4">
                  Ciertos análisis o funcionalidades pueden requerir el pago de una tarifa. Los pagos se procesan a
                  través de MercadoPago u otros procesadores de pago autorizados. Al realizar un pago:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Acepta los términos y condiciones del procesador de pagos</li>
                  <li>Garantiza que la información de pago proporcionada es correcta</li>
                  <li>Reconoce que los precios pueden variar y se informarán antes de confirmar la transacción</li>
                </ul>
                <p className="text-muted-foreground">
                  <strong>Política de reembolsos:</strong> Los reembolsos se evaluarán caso por caso. Si el Servicio no
                  funcionó correctamente por causas atribuibles a nosotros, se procederá al reembolso correspondiente
                  dentro de los 30 días posteriores a la compra.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">7. Limitación de Responsabilidad</h2>
                <p className="text-muted-foreground mb-4">
                  ExpensaCheck proporciona el Servicio "tal cual" y "según disponibilidad". En la máxima medida permitida
                  por la ley aplicable:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>No garantizamos que el Servicio será ininterrumpido, seguro o libre de errores</li>
                  <li>No garantizamos la exactitud, completitud o utilidad de los análisis generados</li>
                  <li>No somos responsables por decisiones tomadas basándose en los análisis del Servicio</li>
                  <li>No somos responsables por pérdidas indirectas, incidentales o consecuentes</li>
                  <li>Nuestra responsabilidad total se limita al monto pagado por el usuario en los últimos 12 meses</li>
                </ul>
                <p className="text-muted-foreground">
                  Los análisis de expensas son orientativos y no reemplazan la verificación manual de los documentos
                  originales ni el asesoramiento profesional.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">8. Indemnización</h2>
                <p className="text-muted-foreground">
                  Usted acepta indemnizar, defender y mantener indemne a ExpensaCheck, sus directores, empleados,
                  agentes y afiliados de cualquier reclamo, daño, pérdida, responsabilidad, costo y gasto (incluyendo
                  honorarios legales) que surja de: (a) su uso del Servicio; (b) su incumplimiento de estos Términos;
                  (c) su violación de derechos de terceros; o (d) contenido que usted proporcione a través del Servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">9. Modificaciones del Servicio</h2>
                <p className="text-muted-foreground">
                  Nos reservamos el derecho de modificar, suspender o discontinuar el Servicio (o cualquier parte del
                  mismo) en cualquier momento, con o sin previo aviso. No seremos responsables ante usted ni ante
                  terceros por cualquier modificación, suspensión o discontinuación del Servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">10. Terminación</h2>
                <p className="text-muted-foreground mb-4">
                  Podemos terminar o suspender su acceso al Servicio de inmediato, sin previo aviso ni responsabilidad,
                  por cualquier motivo, incluyendo, sin limitación, si usted incumple estos Términos.
                </p>
                <p className="text-muted-foreground">
                  Usted puede cancelar su cuenta en cualquier momento contactándonos. Tras la terminación, su derecho a
                  usar el Servicio cesará inmediatamente.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">11. Ley Aplicable y Jurisdicción</h2>
                <p className="text-muted-foreground">
                  Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República Argentina, sin
                  considerar sus disposiciones sobre conflictos de leyes. Cualquier disputa que surja de o en conexión
                  con estos Términos será sometida a la jurisdicción exclusiva de los tribunales ordinarios de la
                  Ciudad Autónoma de Buenos Aires, República Argentina.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">12. Disposiciones Generales</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Divisibilidad:</strong> Si alguna disposición de estos Términos es considerada inválida o
                    inaplicable, las restantes disposiciones continuarán en pleno vigor y efecto.</li>
                  <li><strong>Renuncia:</strong> La falta de ejercicio de cualquier derecho establecido en estos Términos
                    no constituirá una renuncia a dicho derecho.</li>
                  <li><strong>Cesión:</strong> Usted no puede ceder ni transferir estos Términos sin nuestro consentimiento
                    previo por escrito.</li>
                  <li><strong>Acuerdo completo:</strong> Estos Términos constituyen el acuerdo completo entre usted y
                    ExpensaCheck respecto al uso del Servicio.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">13. Contacto</h2>
                <p className="text-muted-foreground">
                  Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos a través de nuestra{" "}
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

export default Terminos;
