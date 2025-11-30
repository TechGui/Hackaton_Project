import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import "./CSVImport.css";

export function CSVImport() {
  const [csvData, setCsvData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const importSlotsMutation = useMutation(api.appointments.importSlots);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvData(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const slots = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 5) {
        slots.push({
          date: values[0],
          time: values[1],
          doctorName: values[2],
          specialty: values[3],
          location: values[4],
        });
      }
    }
    return slots;
  };

  const handleImport = async () => {
    if (!csvData) {
      toast.error("Por favor, envie um arquivo CSV primeiro");
      return;
    }

    setIsProcessing(true);
    try {
      const slots = parseCSV(csvData);
      if (slots.length === 0) {
        toast.error("Nenhum horário válido encontrado no CSV");
        return;
      }

      const results = await importSlotsMutation({ slots });
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Importados ${successful} horários com sucesso`);
      }
      if (failed > 0) {
        toast.warning(`${failed} horários foram ignorados (duplicados ou inválidos)`);
      }

      setCsvData("");
    } catch (error) {
      toast.error("Falha ao importar horários");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 className="titulo">Importar Horários Disponíveis</h2>
        
        <div className="card-content">
          <div>
            <label className="label">
              Formato do Arquivo CSV
            </label>
            <div className="csv-info">
              <p className="csv-info-title">Colunas esperadas (nesta ordem):</p>
              <ul className="csv-info-list">
                <li>Data (formato YYYY-MM-DD)</li>
                <li>Hora (formato HH:MM)</li>
                <li>Nome do Médico</li>
                <li>Especialidade</li>
                <li>Local</li>
              </ul>
              <p className="csv-info-exemplo">
                Exemplo: 2024-01-15,09:00,Dr. Silva,Cardiologia,Sala 101
              </p>
            </div>
          </div>

          <div>
            <label className="label">
              Enviar Arquivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="input-file"
            />
          </div>

          {csvData && (
            <div>
              <label className="label">
                Pré-visualização
              </label>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={10}
                className="text-area"
                placeholder="Os dados do CSV aparecerão aqui..."
              />
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!csvData || isProcessing}
            className="botao"
          >
            {isProcessing ? "Processando..." : "Importar Horários"}
          </button>
        </div>
      </div>
    </div>
  );
}
