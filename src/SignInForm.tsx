"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import "./SignInForm.css";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="signin-container">
      <form
        className="signin-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Senha inválida. Tente novamente.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Não foi possível entrar. Você quis dizer criar uma conta?"
                  : "Não foi possível criar a conta. Você quis dizer entrar?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="E-mail"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Senha"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Entrar" : "Criar conta"}
        </button>

        <div className="switch-flow-text">
          <span>
            {flow === "signIn"
              ? "Não tem uma conta? "
              : "Já possui uma conta? "}
          </span>

          <button
            type="button"
            className="switch-flow-button"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Criar conta" : "Entrar"}
          </button>
        </div>
      </form>

      <div className="divider">
        <hr className="divider-line" />
        <span className="divider-text">ou</span>
        <hr className="divider-line" />
      </div>

      <button
        className="auth-button"
        onClick={() => void signIn("anonymous")}
      >
        Entrar anonimamente
      </button>
    </div>
  );
}
