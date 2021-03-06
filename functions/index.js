const functions = require("firebase-functions");
const admin = require("firebase-admin");
const xlsx = require("xlsx");
const serviceAccount = require("./hih-sensor-firebase-adminsdk-kmoz1-558a68e0dc.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hih-sensor.firebaseio.com",
});

const express = require("express");
const app = express();

app.get("/start", async (req, res) => {
  try {
    const currentExperimentSnapshot = await admin
      .firestore()
      .collection("meta")
      .doc("currentExperiment")
      .get();

    // If there's a current experiment running, return an error
    if (currentExperimentSnapshot.get("id") !== null) {
      return res
        .status(500)
        .send("Please end the current experiment before starting a new one.");
    }

    const newExperiment = await admin
      .firestore()
      .collection("experiments")
      .add({ start: admin.firestore.FieldValue.serverTimestamp() });

    await currentExperimentSnapshot.ref.update({ id: newExperiment.id });

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

app.get("/stop", async (req, res) => {
  try {
    const currentExperimentSnapshot = await admin
      .firestore()
      .collection("meta")
      .doc("currentExperiment")
      .get();

    const currentExperimentId = currentExperimentSnapshot.get("id");

    // If there's not current experiment running, return an error
    if (currentExperimentId === null) {
      return res.status(500).send("There is no experiment currently running.");
    }

    const runningExperimentSnapshot = await admin
      .firestore()
      .collection("experiments")
      .doc(currentExperimentId)
      .update({ end: admin.firestore.FieldValue.serverTimestamp() });

    await currentExperimentSnapshot.ref.update({ id: null });

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

app.get("/download/:sensor", async (req, res) => {
  try {
    const { sensor } = req.params;
    const { start, end } = req.query;

    const sensorSnapshot = await admin
      .firestore()
      .collection("sensors")
      .doc(sensor)
      .get();

    const readings = await sensorSnapshot.ref
      .collection("readings")
      .where("time", ">", new Date(start))
      .where("time", "<=", end ? new Date(end) : new Date())
      .orderBy("time", "asc")
      .get();

    const json = readings.docs.map((doc) => {
      const data = doc.data();
      data.time = data.time
        .toDate()
        .toLocaleString("en-US", { timeZone: "America/Chicago" });
      return data;
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(json);
    xlsx.utils.book_append_sheet(wb, ws);
    const out = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
    res.set({
      "Content-Disposition": `attachment; filename=${sensor}.xlsx`,
    });
    res.type("xlsx").send(new Buffer(out));
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

app.get("/clear/:sensor", async (req, res) => {
  try {
    const { sensor } = req.params;
    await admin.firestore().collection("sensors").doc(sensor).set({
      earliestReading: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// Handle GET request containing a reading
app.get("/sensor", async (req, res) => {
  const { sensor, humidity, temperature } = req.query;

  try {
    // Save to Firestore
    const sensorSnapshot = await admin
      .firestore()
      .collection("sensors")
      .doc(sensor)
      .get();

    if (!sensorSnapshot.exists) {
      await sensorSnapshot.ref.set({
        earliestReading: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await sensorSnapshot.ref
      .collection("readings")
      .doc()
      .create({
        time: admin.firestore.FieldValue.serverTimestamp(),
        humidity: parseFloat(humidity),
        temperature: parseFloat(temperature),
      });

    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

exports.api = functions.https.onRequest(app);
