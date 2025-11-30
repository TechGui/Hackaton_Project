import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import "./AppointmentManager.css";

export function AppointmentManager() {
  const [dataSelecionada, setDataSelecionada] = useState("");


  const [especialidadeSelecionada, setEspecialidadeSelecionada] =
    useState("");
  const [tipoServicoSelecionado, setTipoServicoSelecionado] =
    useState("");

  const deleteSlot = useMutation(api.appointments.deleteSlot);

  const TipoServiço = ["Consulta", "Exame"];

  const especialidades = [
    "Cardiologia",
    "Dermatologia",
    "Endocrinologia",
    "Gastroenterologia",
    "Neurologia",
    "Oncologia",
    "Ortopedia",
    "Pediatria",
    "Psiquiatria",
    "Radiologia",
  ];

  const horariosDisponiveis = useQuery(
    api.appointments.getAvailableSlots,
    {
      date: dataSelecionada,
      specialty: especialidadeSelecionada || undefined,
    }
  );

  return (
    <div className="ag-container">

      {/* TEXTO */}
      <div className="ag-desc">
        <p>
          Visualize os <strong>agendamentos do dia</strong> e filtre por data e tipo de serviço,
          como consultas ou exames.
        </p>
      </div>

      {/* FILTROS */}
      <div className="ag-filter-section">

        <select
          className="ag-chip blue"
          value={tipoServicoSelecionado}
          onChange={(e) => setTipoServicoSelecionado(e.target.value)}
        >
          <option value="">Tipo de Serviço</option>
          {TipoServiço.map((tipo) => (
            <option key={tipo}>{tipo}</option>
          ))}
        </select>

        <select
          value={especialidadeSelecionada}
          onChange={(e) => setEspecialidadeSelecionada(e.target.value)}
          className="ag-chip red"
        >
          <option value="">Especialidade</option>
          {especialidades.map((esp) => (
            <option key={esp}>{esp}</option>
          ))}
        </select>

        <select
          className="ag-chip yellow"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
        >
          <option value="">Data</option>
          {[...Array(7)].map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const val = date.toISOString().split("T")[0];
            return (
              <option key={val} value={val}>
                {val}
              </option>
            );
          })}
        </select>

      </div>

      {/* LISTA */}
      <div className="ag-lista">
        {horariosDisponiveis?.map((slot) => (
          <div key={slot._id} className="ag-card">

            {/* Linha superior */}
            <div className="ag-card-top">
              <span className="ag-nome">{slot.doctorName}</span>

              <div className="ag-info-icons">
                <div className="ag-status-container">
                  <span className="ag-status disponivel">Disponível</span>

                  {/* EXCLUIR */}
                  <button
                    className="ag-delete-btn"
                    onClick={() => deleteSlot({ slotId: slot._id })}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="ag-tags">
              <div className="ag-badge gray">
                {tipoServicoSelecionado || "Consulta"}
              </div>
              <div className="ag-badge gray">{slot.location}</div>
              <div className="ag-badge gray">{slot.specialty}</div>
              <div className="ag-badge gray">{slot.time}</div>
              <div className="ag-badge outline">Aguardando Confirmação</div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
