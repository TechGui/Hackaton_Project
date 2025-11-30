import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { AdminDashboard } from "./components/AdminDashboard";
import { PatientPortal } from "./components/PatientPortal";

import "./app.css";

export default function App() {
  return (
    <div className="app-container">


  <div className="menu-container">
    <img src="./src/public/menuAdmin.png" alt="Menu Admin" className="menu-bg" />
    <img src="./src/public/logoAdmin.png" alt="Logo Admin" className="logo-admin" />

</div>

        <Authenticated>
          <SignOutButton />
        </Authenticated>


      <main className="app-main">
        <Content />
      </main>

      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const setupAdminRole = useMutation(api.appointments.setupAdminRole);

  const handleSetupAdmin = async () => {
    if (loggedInUser?._id) {
      try {
        await setupAdminRole({ userId: loggedInUser._id });
        toast.success("Função de administrador atribuída com sucesso!");
      } catch (error) {
        toast.error("Falha ao atribuir função de administrador");
      }
    }
  };

  if (loggedInUser === undefined) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <Unauthenticated>
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-title">Agendador Médico</h1>
            <p className="login-subtitle">Faça login para acessar o sistema de agendamentos</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        {loggedInUser?.role === "admin" && <AdminDashboard />}
        {loggedInUser?.role === "patient" && <PatientPortal />}

        {!loggedInUser?.role && (
          <div className="role-setup">
            <h2 className="role-title">Bem-vindo ao Vitalis!</h2>
            <p className="role-text">
              Para começar, você precisa definir sua função no sistema.
            </p>

            <button onClick={handleSetupAdmin} className="btn-admin">
              Definir como Administrador
            </button>

            <p className="role-note">
              Clique acima para configurar seu usuário como administrador.  
              Contas de pacientes são criadas por administradores.
            </p>
          </div>
        )}

      </Authenticated>
    </div>
  );
}
