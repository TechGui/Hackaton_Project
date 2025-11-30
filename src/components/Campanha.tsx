import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import "./CampanhaStyle.css"; 

export default function CampanhasPage() {
  const [form, setForm] = useState({
    nome: "",
    publico: "",
    unidades: "",
    descricao: "",
    inicio: "",
    fim: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="container">

      <div className="page-title">
        Cadastre novas <span className="bold">campanhas</span>
      </div>

      <Card className="card">
        <CardContent className="card-content">
          <input
            name="nome"
            placeholder="Nome da campanha"
            value={form.nome}
            onChange={handleChange}
          />
          <input
            name="publico"
            placeholder="Público"
            value={form.publico}
            onChange={handleChange}
          />
          <input
            name="unidades"
            placeholder="Unidades participantes"
            value={form.unidades}
            onChange={handleChange}
            className="col-span-2"
          />
          <input
            name="descricao"
            placeholder="Descrição da campanha"
            value={form.descricao}
            onChange={handleChange}
            className="col-span-2"
          />
    
<div className="field">
  <label className="label">Data início</label>
  <input
    type="date"
    name="inicio"
    value={form.inicio}
    onChange={handleChange}
  />
</div>

<div className="field">
  <label className="label">Data fim</label>
  <input
    type="date"
    name="fim"
    value={form.fim}
    onChange={handleChange}
  />
</div>

          <Button className="btn">Cadastrar campanha</Button>
        </CardContent>
      </Card>
    </div>
  );
}
