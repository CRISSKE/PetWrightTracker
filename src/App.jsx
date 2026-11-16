import { useRef, useState } from "react";
import "./App.css";

function App() {
  const [cats, setCats] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [currentWeight, setCurrentWeight] = useState("");
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [graphPetId, setGraphPetId] = useState("all");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingRecordDate, setEditingRecordDate] = useState("");
  const [editingRecordWeight, setEditingRecordWeight] = useState("");
  const nextId = useRef(1);

  const selectedCat = cats.find((cat) => cat.id === selectedCatId);

  function createId() {
    const id = nextId.current;
    nextId.current += 1;
    return id;
  }

  function addCat() {
    const newCat = {
      id: createId(),
      name: "New Cat",
      targetWeight: "",
      kcalPer100g: "",
      activityFactor: "1.2",
      isNeutered: "yes",
      records: [],
    };

    setCats([...cats, newCat]);
    setSelectedCatId(newCat.id);
    setExpandedRecordId(null);
    cancelRecordEdit();
  }

  function updateSelectedCat(field, value) {
    setCats(
      cats.map((cat) =>
        cat.id === selectedCatId ? { ...cat, [field]: value } : cat
      )
    );
  }

  function addWeightRecord() {
    if (!selectedCat) {
      alert("Please add or select a cat first.");
      return;
    }

    if (!currentWeight) {
      alert("Please enter current weight.");
      return;
    }

    const newRecord = {
      id: createId(),
      date: new Date().toISOString().slice(0, 10),
      weight: Number(currentWeight),
    };

    setCats(
      cats.map((cat) =>
        cat.id === selectedCatId
          ? {
              ...cat,
              records: sortRecordsByDateDesc([newRecord, ...cat.records]),
            }
          : cat
      )
    );

    setCurrentWeight("");
  }

  function formatRecordDate(date) {
    if (!date) return "";

    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString();
  }

  function getDateInputValue(date) {
    if (!date) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }

    return parsedDate.toISOString().slice(0, 10);
  }

  function sortRecordsByDateDesc(records) {
    return [...records].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();

      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return b.id - a.id;
      }

      return bTime - aTime || b.id - a.id;
    });
  }

  function startRecordEdit(record) {
    setEditingRecordId(record.id);
    setEditingRecordDate(getDateInputValue(record.date));
    setEditingRecordWeight(String(record.weight));
    setExpandedRecordId(record.id);
  }

  function cancelRecordEdit() {
    setEditingRecordId(null);
    setEditingRecordDate("");
    setEditingRecordWeight("");
  }

  function saveRecordEdit() {
    if (!editingRecordDate) {
      alert("Please enter a date.");
      return;
    }

    if (!editingRecordWeight) {
      alert("Please enter a weight.");
      return;
    }

    setCats(
      cats.map((cat) =>
        cat.id === selectedCatId
          ? {
              ...cat,
              records: sortRecordsByDateDesc(
                cat.records.map((record) =>
                  record.id === editingRecordId
                    ? {
                        ...record,
                        date: editingRecordDate,
                        weight: Number(editingRecordWeight),
                      }
                    : record
                )
              ),
            }
          : cat
      )
    );

    cancelRecordEdit();
  }

  function removeWeightRecord(recordId) {
    setCats(
      cats.map((cat) =>
        cat.id === selectedCatId
          ? {
              ...cat,
              records: cat.records.filter((record) => record.id !== recordId),
            }
          : cat
      )
    );

    if (expandedRecordId === recordId) {
      setExpandedRecordId(null);
    }

    if (editingRecordId === recordId) {
      cancelRecordEdit();
    }
  }

  function calculateRecommendation(cat, recordList = cat?.records || []) {
    if (!cat || !cat.targetWeight || !cat.kcalPer100g) return null;

    const target = Number(cat.targetWeight);
    const foodCalories = Number(cat.kcalPer100g);
    const baseFactor = Number(cat.activityFactor);

    const rer = 70 * Math.pow(target, 0.75);

    let adjustedFactor = baseFactor;
    let message = "Not enough weight records to adjust yet.";
    let changePercent = null;

    if (cat.isNeutered === "yes") {
      adjustedFactor -= 0.1;
    } else {
      adjustedFactor += 0.1;
    }

    if (recordList.length >= 2) {
      const latest = recordList[0].weight;
      const previous = recordList[1].weight;

      changePercent = ((latest - previous) / previous) * 100;

      if (changePercent > 0) {
        adjustedFactor -= 0.1;
        message = "Weight increased. Activity factor adjusted down.";
      } else if (changePercent < -2) {
        adjustedFactor += 0.1;
        message = "Weight loss is too fast. Activity factor adjusted up.";
      } else if (changePercent <= -0.5 && changePercent >= -2) {
        message = "Weight loss is on track. Keep the same amount.";
      } else {
        adjustedFactor -= 0.05;
        message = "Weight loss is slow. Activity factor slightly adjusted down.";
      }
    }

    adjustedFactor = Math.max(0.8, Math.min(adjustedFactor, 1.6));

    const dailyCalories = rer * adjustedFactor;
    const gramsPerDay = (dailyCalories / foodCalories) * 100;

    return {
      rer: rer.toFixed(0),
      calories: dailyCalories.toFixed(0),
      grams: gramsPerDay.toFixed(1),
      baseFactor: baseFactor.toFixed(2),
      adjustedFactor: adjustedFactor.toFixed(2),
      changePercent: changePercent === null ? null : changePercent.toFixed(2),
      message,
    };
  }

  function getRecordRecommendation(index) {
    const recordsUpToThatTime = selectedCat.records.slice(index);
    return calculateRecommendation(selectedCat, recordsUpToThatTime);
  }

  const latestWeight =
    selectedCat && selectedCat.records.length > 0
      ? selectedCat.records[0].weight
      : null;

  const recommendation = calculateRecommendation(selectedCat);
  const chartPets = cats
    .map((cat, catIndex) => ({
      ...cat,
      color: ["#f97316", "#2563eb", "#16a34a", "#9333ea", "#dc2626"][
        catIndex % 5
      ],
      records: [...cat.records].reverse(),
    }))
    .filter((cat) => graphPetId === "all" || cat.id === Number(graphPetId))
    .filter((cat) => cat.records.length > 0);

  const chartWeights = chartPets.flatMap((cat) =>
    cat.records.map((record) => record.weight)
  );
  const minChartWeight =
    chartWeights.length > 0 ? Math.min(...chartWeights) : 0;
  const maxChartWeight =
    chartWeights.length > 0 ? Math.max(...chartWeights) : 0;
  const chartRange = Math.max(maxChartWeight - minChartWeight, 1);
  const maxChartRecords = Math.max(
    1,
    ...chartPets.map((cat) => cat.records.length - 1)
  );

  function getChartPoints(records) {
    return records
      .map((record, index) => {
        const x = 28 + (index / maxChartRecords) * 324;
        const y = 180 - ((record.weight - minChartWeight) / chartRange) * 140;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="app">
      <div className="card">
        <h1>🐱 Cat Weight Manager</h1>
        <p className="subtitle">Multi-cat dynamic feeding calculator</p>

        <div className="form">
          <button onClick={addCat}>Add Cat</button>

          <select
            value={selectedCatId || ""}
            onChange={(e) => {
              setSelectedCatId(Number(e.target.value));
              setExpandedRecordId(null);
              cancelRecordEdit();
            }}
          >
            <option value="">Select a cat</option>
            {cats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {selectedCat && (
            <>
              <input
                type="text"
                placeholder="Cat name"
                value={selectedCat.name}
                onChange={(e) => updateSelectedCat("name", e.target.value)}
              />

              <input
                type="number"
                placeholder="Target weight (kg)"
                value={selectedCat.targetWeight}
                onChange={(e) =>
                  updateSelectedCat("targetWeight", e.target.value)
                }
              />

              <input
                type="number"
                placeholder="Food kcal per 100g"
                value={selectedCat.kcalPer100g}
                onChange={(e) =>
                  updateSelectedCat("kcalPer100g", e.target.value)
                }
              />

              <select
                value={selectedCat.activityFactor}
                onChange={(e) =>
                  updateSelectedCat("activityFactor", e.target.value)
                }
              >
                <option value="1.0">Low activity</option>
                <option value="1.2">Normal activity</option>
                <option value="1.4">High activity</option>
              </select>

              <select
                value={selectedCat.isNeutered}
                onChange={(e) =>
                  updateSelectedCat("isNeutered", e.target.value)
                }
              >
                <option value="yes">Neutered / Spayed</option>
                <option value="no">Not Neutered</option>
              </select>

              <input
                type="number"
                placeholder="Current weight (kg)"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
              />

              <button onClick={addWeightRecord}>Add Weight Record</button>
            </>
          )}
        </div>

        {selectedCat && latestWeight !== null && recommendation && (
          <div className="result">
            <h2>{selectedCat.name || "Your cat"}'s Status</h2>
            <p>Current Weight: {latestWeight} kg</p>
            <p>RER: {recommendation.rer} kcal/day</p>
            <p>Adjusted Factor: {recommendation.adjustedFactor}</p>
            <p>Suggested Calories: {recommendation.calories} kcal/day</p>
            <p>Suggested Food: {recommendation.grams} g/day</p>
            <p className="message">{recommendation.message}</p>
          </div>
        )}

        {selectedCat && (
          <>
            <h2>Weight History</h2>

            <div className="records">
              {selectedCat.records.length === 0 ? (
                <p className="empty">No weight records yet.</p>
              ) : (
                selectedCat.records.map((record, index) => {
                  const recordRecommendation = getRecordRecommendation(index);
                  const isExpanded = expandedRecordId === record.id;

                  return (
                    <div className="record-card" key={record.id}>
                      <div
                        className="record"
                        onClick={() =>
                          setExpandedRecordId(isExpanded ? null : record.id)
                        }
                      >
                        <span>{formatRecordDate(record.date)}</span>
                        <strong>{record.weight} kg</strong>
                        <span>{isExpanded ? "▲" : "▼"}</span>
                      </div>

                      {isExpanded && recordRecommendation && (
                        <div className="record-detail">
                          {editingRecordId === record.id ? (
                            <div className="record-edit-form">
                              <input
                                type="date"
                                value={editingRecordDate}
                                onChange={(e) =>
                                  setEditingRecordDate(e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={editingRecordWeight}
                                onChange={(e) =>
                                  setEditingRecordWeight(e.target.value)
                                }
                                placeholder="Weight (kg)"
                              />
                              <div className="record-actions">
                                <button onClick={saveRecordEdit}>Save</button>
                                <button
                                  className="secondary-button"
                                  onClick={cancelRecordEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p>RER: {recordRecommendation.rer} kcal/day</p>
                              <p>
                                Base Factor: {recordRecommendation.baseFactor}
                              </p>
                              <p>
                                Adjusted Factor:{" "}
                                {recordRecommendation.adjustedFactor}
                              </p>
                              <p>
                                Weight Change:{" "}
                                {recordRecommendation.changePercent === null
                                  ? "Not enough data"
                                  : `${recordRecommendation.changePercent}%`}
                              </p>
                              <p>
                                Suggested Calories:{" "}
                                {recordRecommendation.calories} kcal/day
                              </p>
                              <p>
                                Suggested Food: {recordRecommendation.grams} g/day
                              </p>
                              <p className="message">
                                {recordRecommendation.message}
                              </p>
                              <div className="record-actions">
                                <button onClick={() => startRecordEdit(record)}>
                                  Edit
                                </button>
                                <button
                                  className="danger-button"
                                  onClick={() => removeWeightRecord(record.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {cats.length > 0 && (
          <div className="graph-section">
            <div className="section-heading">
              <h2>Graph View</h2>
              <select
                value={graphPetId}
                onChange={(e) => setGraphPetId(e.target.value)}
                aria-label="Choose pet for graph"
              >
                <option value="all">All pets</option>
                {cats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name || "Unnamed cat"}
                  </option>
                ))}
              </select>
            </div>

            {chartPets.length === 0 ? (
              <p className="empty">Add weight records to see the graph.</p>
            ) : (
              <>
                <div className="weight-chart">
                  <svg viewBox="0 0 380 220" role="img">
                    <title>Weight change over time</title>
                    <line x1="28" y1="40" x2="28" y2="180" />
                    <line x1="28" y1="180" x2="352" y2="180" />
                    <text x="28" y="26">
                      {maxChartWeight.toFixed(1)} kg
                    </text>
                    <text x="28" y="204">
                      {minChartWeight.toFixed(1)} kg
                    </text>

                    {chartPets.map((cat) => (
                      <g key={cat.id}>
                        <polyline
                          points={getChartPoints(cat.records)}
                          stroke={cat.color}
                        />
                        {cat.records.map((record, index) => {
                          const pointX =
                            28 + (index / maxChartRecords) * 324;
                          const pointY =
                            180 -
                            ((record.weight - minChartWeight) / chartRange) *
                              140;

                          return (
                            <circle
                              key={record.id}
                              cx={pointX}
                              cy={pointY}
                              r="4"
                              fill={cat.color}
                            />
                          );
                        })}
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="chart-legend">
                  {chartPets.map((cat) => {
                    const firstWeight = cat.records[0].weight;
                    const lastWeight = cat.records[cat.records.length - 1].weight;
                    const change = lastWeight - firstWeight;

                    return (
                      <div className="legend-item" key={cat.id}>
                        <span
                          className="legend-color"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name || "Unnamed cat"}</span>
                        <strong>
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)} kg
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
