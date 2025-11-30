import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { CSVImport } from "./CSVImport";
import { WaitlistManager } from "./WaitlistManager";
import { AppointmentManager } from "./AppointmentManager";
import CampanhasPage from "./Campanha";
import "./AdminDashboard.css";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "import" | "waitlist" | "appointments" | "campanha"
  >("dashboard");

  const stats = useQuery(api.appointments.getDashboardStats);
  const initiateCallsAction = useAction(api.twilio.startMessaging);

  const handleInitiateCalls = async () => {
    try {
      await initiateCallsAction({});
      toast.success("Processo de chamadas iniciado com sucesso!");
    } catch (error) {
      toast.error("Falha ao iniciar o processo de chamadas.");
    }
  };

  const tabs = [
    { id: "dashboard", label: "Visão Geral" },
    { id: "import", label: "Importar Horários" },
    { id: "waitlist", label: "Lista de Espera" },
    { id: "appointments", label: "Agendamentos" },
    { id: "campanha", label: "Campanhas"}
  ];

  return (
    <div className="admin-container">
      {/* Cabeçalho */}
      <div className="admin-header">
        <h1 className="admin-title">Painel Administrativo</h1>
        <button className="btn-primary" onClick={handleInitiateCalls}>
          Iniciar Chamadas Automáticas
        </button>
      </div>

      {/* Abas */}
      <div className="tabs-container">
        <nav className="tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === "dashboard" && (
        <div className="stats-grid">
          {stats && (
            <>
              <div className="stat-card">
                <h3 className="stat-label">Total de Pacientes</h3>
                <p className="stat-value">{stats.totalPatients}</p>
              </div>

              <div className="stat-card">
                <h3 className="stat-label">Lista de Espera Ativa</h3>
                <p className="stat-value orange">{stats.activePatients}</p>
              </div>

              <div className="stat-card">
                <h3 className="stat-label">Horários Disponíveis</h3>
                <p className="stat-value red">{stats.availableSlots}</p>
              </div>

              <div className="stat-card">
                <h3 className="stat-label">Atendimentos de Hoje</h3>
                <p className="stat-value blue">{stats.todayAppointments}</p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "import" && <CSVImport />}
      {activeTab === "waitlist" && <WaitlistManager />}
      {activeTab === "appointments" && <AppointmentManager />}
      {activeTab === "campanha" && <CampanhasPage />}
    </div>
  );
}