import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import "./WaitlistManager.css";

// ----------------------------
// WEATHER TRANSLATOR
// ----------------------------
function translateWeather(code: number): string {
  if (code === 0) return "Ensolarado";
  if (code >= 1 && code <= 3) return "Nublado";
  if (code >= 45 && code <= 48) return "Nublado";
  if (code >= 51 && code <= 57) return "Chuva";
  if (code >= 61 && code <= 65) return "Chuva";
  if (code >= 80 && code <= 82) return "Chuva";
  if (code >= 95 && code <= 99) return "Temporal";
  return "Nublado";
}

// ----------------------------
// PROBABILITY CALCULATION
// ----------------------------
function calculateProbability(patient: any, clima: string, diaSemana: string) {
  const birthYear = new Date(patient.dateOfBirth).getFullYear();
  const age = new Date().getFullYear() - birthYear;

  let ageFactor =
    age < 20 ? 0 :
      age < 40 ? 0.1 :
        age < 60 ? 0.2 :
          0.25;
  
  const attemptsFactor = patient.contactAttempts * 0.18;
  
  const climaFactor =
    clima === "Ensolarado" ? 0.1 :
      clima === "Nublado" ? 0.1 :
        clima === "Chuva" ? 0.3 :
          clima === "Temporal" ? 0.4 :
            0;

  const diaFactor =
    diaSemana === "Segunda" ? 0.1 :
      diaSemana === "Terça" ? 0 :
        diaSemana === "Quarta" ? 0 :
          diaSemana === "Quinta" ? 0 :
            diaSemana === "Sexta" ? 0.1 :
              0;

  const finalScore = ageFactor + attemptsFactor + climaFactor + diaFactor;
  return Math.min(1, Number(finalScore.toFixed(2)));
}

export function WaitlistManager() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  const [clima, setClima] = useState("Carregando...");
  const [diaSemana, setDiaSemana] = useState("Segunda");
  const increment = useMutation(api.patients.incrementContactAttempt)
  const decrementAttempt = useMutation(api.patients.decrementContactAttempt);
  // -----------------------------------
  // AUTO FETCH WEATHER ON PAGE LOAD
  // -----------------------------------
  useEffect(() => {
    async function fetchWeather() {
      try {
        const lat = -31.7667;
        const lon = -52.3333;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

        const data = await fetch(url).then(r => r.json());
        const code = data?.current_weather?.weathercode;

        if (code !== undefined) {
          setClima(translateWeather(code));
        } else {
          setClima("Nublado");
        }
      } catch {
        setClima("Nublado");
      }
    }

    fetchWeather();
  }, []);

  const waitlist = useQuery(api.appointments.getWaitlist,
    selectedSpecialty ? { specialty: selectedSpecialty } : {}
  );

  const addPatientMutation = useMutation(api.appointments.addPatient);

  const specialties = [
    "Cardiologia", "Dermatologia", "Endocrinologia", "Gastroenterologia",
    "Neurologia", "Oncologia", "Ortopedia", "Pediatria", "Psiquiatria", "Radiologia"
  ];

  const handleAddPatient = async (formData: FormData) => {
    try {
      await addPatientMutation({
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        phone: formData.get("phone") as string,
        email: formData.get("email") as string || undefined,
        dateOfBirth: formData.get("dateOfBirth") as string,
        specialty: formData.get("specialty") as string,
        priority: parseInt(formData.get("priority") as string),
        notes: formData.get("notes") as string || undefined,
      });

      toast.success("Patient added to waitlist");
      setShowAddForm(false);
    } catch (error) {
      toast.error("Failed to add patient");
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Fila de Espera</h2>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Adicionar Paciente
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Área
          </label>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Área da Saúde</option>
            {specialties.map(specialty => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
        </div>

        {/* CLIMATE – AUTOMÁTICO */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Clima</label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100">
            {clima}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dia da semana</label>
          <select
            value={diaSemana}
            onChange={(e) => setDiaSemana(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option>Segunda</option>
            <option>Terça</option>
            <option>Quarta</option>
            <option>Quinta</option>
            <option>Sexta</option>
          </select>
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">

          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área de Saúde</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adicionado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tentativas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probabilidade</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {waitlist?.map((patient) => {
              const p = calculateProbability(patient, clima, diaSemana);
              const percent = Math.round(p * 100);

              return (
                <tr key={patient._id} className="hover:bg-gray-50">

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {patient.priority}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        DOB: {patient.dateOfBirth}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <a
                        href={`https://wa.me/${patient.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 text-sm underline hover:text-blue-600"
                      >
                        {patient.phone}
                      </a>
                    </div>

                    {patient.email && (
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.specialty}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(patient.addedToWaitlist).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => increment({ id: patient._id })}
                      onContextMenu={(e) => {
                        e.preventDefault(); // impede abrir menu do botão direito
                        decrementAttempt({ id: patient._id });
                      }}
                      className="text-blue-600 text-sm underline hover:text-blue-800 select-none"
                    >
                      {patient.contactAttempts}/3
                    </button>
                  </td>

                  {/* PROBABILITY + WEATHER BELOW */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-center">

                      <span
                        className={`
                          group relative inline-flex items-center px-2.5 py-0.5 rounded-full 
                          text-xs font-medium cursor-pointer
                          ${percent < 40
                            ? "bg-green-100 text-green-800"
                            : percent < 70
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        `}
                      >
                        <span className="group-hover:hidden">
                          {percent < 20
                            ? "MUITO BAIXO"
                            : percent < 40
                              ? "BAIXA"
                              : percent < 61
                                ? "MÉDIA"
                                : percent < 81
                                  ? "ALTA"
                                  : "MUITO ALTA"}
                        </span>

                        <span className="hidden group-hover:inline">
                          {percent}%
                        </span>
                      </span>

                      {/* CLIMATE UNDER PROBABILITY */}
                      <span className="text-xs text-gray-500 mt-1">
                        {clima}
                      </span>

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Patient Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Paciente na Lista</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAddPatient(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  name="firstName"
                  placeholder="Nome"
                  required
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  name="lastName"
                  placeholder="Sobrenome"
                  required
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <input
                name="phone"
                placeholder="Telefone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                name="dateOfBirth"
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                name="specialty"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Área da Saúde</option>
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
              <input
                name="priority"
                type="number"
                min="1"
                placeholder="Prioridade 1 - 5 (1 = URGENTE)"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <textarea
                name="notes"
                placeholder="Notas"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Adicionar Paciente
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
