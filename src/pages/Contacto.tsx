import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, Send, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede superar los 100 caracteres" }),
  email: z
    .string()
    .trim()
    .email({ message: "Ingresá un email válido" })
    .max(255, { message: "El email no puede superar los 255 caracteres" }),
  subject: z.string().min(1, { message: "Seleccioná un asunto" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "El mensaje debe tener al menos 10 caracteres" })
    .max(2000, { message: "El mensaje no puede superar los 2000 caracteres" }),
  // Honeypot field - should remain empty for real users
  honeypot: z.string().max(0).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contacto = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      honeypot: "", // Honeypot - remains empty for real users
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("send-contact-email", {
        body: data,
      });

      if (error) {
        // If the error response has detail, use it
        const errorDetail = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
        throw new Error(errorDetail);
      }

      setIsSubmitted(true);
      toast.success("¡Mensaje enviado correctamente!");
    } catch (error: any) {
      console.error("Error sending contact form:", error);

      let errorMessage = "Error al enviar el mensaje.";
      console.log("Full error caught:", error);

      const errorStr = error.message || "";

      if (errorStr.includes("RESEND_API_KEY_MISSING")) {
        errorMessage = "Configuración incompleta: Falta la clave RESEND_API_KEY en Supabase.";
      } else if (errorStr.includes("ADMIN_DELIVERY_FAILED")) {
        if (errorStr.includes("verify your domain") || errorStr.includes("Trial mode")) {
          errorMessage = "Restricción de Resend: El destinatario no está verificado en tu cuenta gratuita.";
        } else {
          errorMessage = "Error de entrega: " + (errorStr.split("ADMIN_DELIVERY_FAILED: ")[1] || "Error en el servidor de correo.");
        }
      }

      toast.error(errorMessage, {
        description: "Revisá los logs de Supabase o verificá tu cuenta de Resend.",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container max-w-2xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Contacto</h1>
            <p className="text-muted-foreground">
              ¿Tenés alguna consulta, sugerencia o reclamo? Escribinos y te responderemos a la brevedad.
            </p>
          </div>

          {isSubmitted ? (
            <Card variant="glass" className="animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-status-ok-bg mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-status-ok" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Mensaje enviado!</h2>
                <p className="text-muted-foreground mb-6">
                  Gracias por contactarnos. Te responderemos a la brevedad al email que nos indicaste.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                    Enviar otro mensaje
                  </Button>
                  <Button asChild>
                    <Link to="/">Volver al inicio</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card variant="glass" className="animate-fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Formulario de contacto
                </CardTitle>
                <CardDescription>
                  Completá el formulario y te responderemos por email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="tu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asunto</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccioná un asunto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="administraciones">Administraciones (Alto volumen)</SelectItem>
                              <SelectItem value="consulta">Consulta general</SelectItem>
                              <SelectItem value="soporte">Soporte técnico</SelectItem>
                              <SelectItem value="sugerencia">Sugerencia</SelectItem>
                              <SelectItem value="reclamo">Reclamo</SelectItem>
                              <SelectItem value="datos_personales">Solicitud sobre datos personales</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensaje</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Escribí tu mensaje aquí..."
                              className="min-h-[150px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <div className="flex justify-between">
                            <FormMessage />
                            <span className="text-xs text-muted-foreground">
                              {field.value.length}/2000
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Honeypot field - hidden from real users, bots will fill it */}
                    <FormField
                      control={form.control}
                      name="honeypot"
                      render={({ field }) => (
                        <FormItem className="hidden" aria-hidden="true">
                          <FormLabel>Leave this empty</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              tabIndex={-1}
                              autoComplete="off"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>Enviando...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar mensaje
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              También podés escribirnos directamente a{" "}
              <a href="mailto:soporte@expensacheck.com" className="text-primary hover:underline">
                <Mail className="w-4 h-4 inline mr-1" />
                soporte@expensacheck.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contacto;
