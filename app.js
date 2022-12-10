const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
let db = null;
const dbPath = path.join(__dirname, "covid19India.db");
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
app.get("/states/", async (request, response) => {
  const getAllStates = `
    select * from state;
    `;
  const statesArray = await db.all(getAllStates);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateById = `
    select * from state where state_id=${stateId};
    `;
  const state = await db.get(getStateById);
  response.send(convertStateDbObjectToResponseObject(state));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createNewDistrictQuery = `
    INSERT INTO district
     (district_name,state_id,cases,cured,active,deaths)
 VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
    `;
  await db.run(createNewDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictByIdQuery = `
    SELECT * from district where district_id=${districtId};
    `;
  const district = await db.get(getDistrictByIdQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictByIdQuery = `
    DELETE FROM district where district_id=${districtId};
    `;
  await db.run(deleteDistrictByIdQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictByIdQuery = `
    UPDATE district SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${cured},
    deaths=${deaths}
    WHERE district_id=${districtId};
    `;
  await db.run(updateDistrictByIdQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsInStateQuery = `
    SELECT SUM(cases),
    SUM(cured)
    SUM(active),
    SUM(deaths)
    FROM district 
    where state_id=${stateId};
    `;
  const stats = await db.get(getStatsInStateQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateId = `
    SELECT state_id from district where district_id=${districtId}; 
    `;
  const getStateId = await db.get(stateId);
  const getStateNameQuery = `
    SELECT state_name from state where state_id=${getStateId};
    `;
  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});
module.exports = app;
