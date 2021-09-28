const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");

const { ping } = require("./controllers/ping");
const { error } = require("./controllers/error");
const { discovery } = require("./controllers/discovery")
const Hook = require("./controllers/patient-consent-consult");
const Xacml = require("./controllers/xacml");

const app = express();
app.use(cors());
//trust proxy
app.set("trust proxy", true);

//middlewares
process.env.NODE_ENV === "production" || app.use(morgan("dev"));
app.use(bodyParser.json({ type: "application/json" }));

//routes
app.get("/ping", ping);

app.get("/cds-services", discovery)

app.post("/cds-services/patient-consent-consult", Hook.post);
app.post("/xacml", Xacml.post);

app.use(error);

module.exports = {
  app
};
