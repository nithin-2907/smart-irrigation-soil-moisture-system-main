import { useState } from "react";
import { sendPrediction } from "../services/api";

function PredictionForm() {
  const [form, setForm] = useState({
    soilType: "",
    rainfall: "",
    temperature: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await sendPrediction(form);
      setMessage("✅ Data submitted successfully");
      setForm({ soilType: "", rainfall: "", temperature: "" });
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setMessage("❌ Failed to submit data");
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <input
          name="soilType"
          placeholder="Soil Type"
          value={form.soilType}
          onChange={handleChange}
          required
        />

        <input
          name="rainfall"
          type="number"
          placeholder="Rainfall (mm)"
          value={form.rainfall}
          onChange={handleChange}
          required
        />

        <input
          name="temperature"
          type="number"
          placeholder="Temperature (°C)"
          value={form.temperature}
          onChange={handleChange}
          required
        />

        <button type="submit">Submit</button>
      </form>

      {message && <p className="msg">{message}</p>}
    </div>
  );
}

export default PredictionForm;
