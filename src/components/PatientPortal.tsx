import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import "./PatientPortal.css";

export function PatientPortal() {
  const [showRescheduleModal, setShowRescheduleModal] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  
  const appointments = useQuery(api.appointments.getMyAppointments);
  const requestRescheduleMutation = useMutation(api.appointments.requestReschedule);

  const handleReschedule = async (appointmentId: string) => {
    try {
      await requestRescheduleMutation({
        appointmentId: appointmentId as any,
        reason: rescheduleReason || undefined,
      });
      toast.success("Solicitação de reagendamento enviada. Você será contactado para marcar um novo horário.");
      setShowRescheduleModal(null);
      setRescheduleReason("");
    } catch (error) {
      toast.error("Falha ao solicitar reagendamento");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meus Agendamentos</h1>
        <p className="text-gray-600">Visualize e gerencie seus agendamentos</p>
      </div>

      {appointments && appointments.length > 0 ? (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {appointment.slot.specialty} - Consulta
                  </h3>
                  <p className="text-gray-600">Dr(a). {appointment.slot.doctorName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Data & Horário</h4>
                  <p className="text-gray-600">
                    {new Date(appointment.slot.date).toLocaleDateString()} às {appointment.slot.time}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Local</h4>
                  <p className="text-gray-600">{appointment.slot.location}</p>
                </div>
              </div>

              {appointment.notes && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Observações</h4>
                  <p className="text-gray-600">{appointment.notes}</p>
                </div>
              )}

              <div className="text-sm text-gray-500 mb-4">
                Agendado em: {new Date(appointment.scheduledAt).toLocaleDateString()}
                {appointment.rescheduleCount > 0 && (
                  <span className="ml-2">• Reagendado {appointment.rescheduleCount} vez(es)</span>
                )}
              </div>

              {appointment.status === "scheduled" && (
                <button
                  onClick={() => setShowRescheduleModal(appointment._id)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Solicitar Reagendamento
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Agendamento</h3>
          <p className="text-gray-600">Você não possui agendamentos no momento.</p>
        </div>
      )}

      {/* Modal de Reagendamento */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitar Reagendamento</h3>
            <p className="text-gray-600 mb-4">
              Informe um motivo para o reagendamento (opcional). Você será contactado para marcar um novo horário.
            </p>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="Motivo do reagendamento..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleReschedule(showRescheduleModal)}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Enviar Solicitação
              </button>
              <button
                onClick={() => {
                  setShowRescheduleModal(null);
                  setRescheduleReason("");
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
