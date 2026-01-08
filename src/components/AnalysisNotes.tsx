import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisNotesProps {
  analysisId: string;
  initialNotes: string | null;
  onNotesUpdate?: (notes: string) => void;
}

export const AnalysisNotes = ({
  analysisId,
  initialNotes,
  onNotesUpdate,
}: AnalysisNotesProps) => {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState(initialNotes || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("expense_analyses")
        .update({ notes })
        .eq("id", analysisId);

      if (error) throw error;

      setSavedNotes(notes);
      setIsEditing(false);
      onNotesUpdate?.(notes);
      toast.success("Notas guardadas");
    } catch (error: any) {
      console.error("Error saving notes:", error);
      toast.error("Error al guardar las notas");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(savedNotes);
    setIsEditing(false);
  };

  return (
    <Card variant="soft" className="animate-fade-in-up">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary-soft flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Notas personales</h3>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  {savedNotes ? "Editar" : "Agregar"}
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregá tus observaciones, recordatorios o notas sobre esta expensa..."
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : savedNotes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {savedNotes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No tenés notas para este análisis. Hacé clic en "Agregar" para
                escribir tus observaciones.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisNotes;
