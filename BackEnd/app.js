const express = require("express");
const path = require("path");

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

var customers = require("./Customers");
const Cloudant = require("@cloudant/cloudant");
const { json } = require("express");

cloudantConnect();

async function cloudantConnect() {
  console.log("Connecting to Cloudant...");
  try {
    const cloudant = Cloudant({
      url: "https://27a608e4-6a10-4151-b714-b3792e23dabc-bluemix.cloudantnosqldb.appdomain.cloud",
      plugins: {
        iamauth: {
          iamApiKey: "aoI7pfxe8vrxo8rDWfSQfHlww9DTelTjC7cVvGn9rP46",
        },
      },
    });


    console.log("Successfully Connected to Cloudant");

    try {
      var allDBs = await cloudant.db.list();
      // console.log(`List of Cloudent DBs : ${allDBs}`)

      if (allDBs.indexOf("customers") == -1) {
        cloudant.db.create("customers");

        var custo = cloudant.db.use("customers");
        await custo.insert({ customers });

        console.log(`Initiated 'customers' database Successfully`);
      } else {
        console.log(`Connecting to Database - customers...`);
        var custo = cloudant.db.use("customers");
        console.log(`Successfully Connected to Database - customers`);
      }

      //   Getting doc from customer DB :

      listOfDocs = await custo.list("customers", { include_docs: true });
      var docREV = await listOfDocs["rows"][0]["value"]["rev"];
      var docID = await listOfDocs["rows"][0]["id"];

      var tt = await custo.get(docID);
      customers = tt["customers"];

      console.log("BackEnd Microservice is ready to serve");

      const idFilter = (req) => (member) => member.id === req.params.id;

      const taskIdFilter = (req) => (task) => task.id === req.params.taskId;

      // API - Home page
      app.get("/", (req, res) => {
        res.send("Home Page");
      });

      // API - Gets All customers
      app.get("/customers/", async (req, res) => res.json(customers));

      // API - Get Single Member
      app.get("/customers/:id", async (req, res) => {
        const found = customers.some(idFilter(req));
        console.log(found);
        console.log(typeof req.params.id);

        if (found) {
          res.json(customers.filter(idFilter(req)));
        } else {
          res
            .status(400)
            .json({ msg: `No member with the id of ${req.params.id}` });
        }
      });

      // API - Get Single Member
      app.get("/gettasks/:id", async (req, res) => {
        const found = customers.some(idFilter(req));
        console.log(found);
        console.log(typeof req.params.id);
        if (found) {
          var temp = customers.filter(idFilter(req));
          // res.json({"Balance" : temp[0]["tasks"]});
          res.json(temp[0]["tasks"]);
        } else {
          res
            .status(400)
            .json({ msg: `No member with given credentials` });
        }
      });

      // API - Create Member
      app.post("/customers/", async (req, res) => {
        const newMember = {
          ...req.body,
          tasks: {

          },
        };

        const found = customers.some(
          (customer) =>
            JSON.stringify(customer.id) === JSON.stringify(newMember.id)
        );

        if (found) {
          return res.status(400).json({ msg: "Already existing customer" });
        }

        if (!newMember.id) {
          return res.status(400).json({ msg: "Invalid Access" });
        }

        if (!newMember.name) {
          return res
            .status(400)
            .json({ msg: "Please include a name" });
        }

        customers.push(newMember);
        res.json(customers);

        // res.redirect('/');
        console.log("Updating on Cloudant...");
        try {
          await custo.insert({
            _id: docID,
            _rev: docREV,
            customers,
          });
          console.log(docREV);
          listOfDocs = await custo.list("customers", { include_docs: true });
          docREV = await listOfDocs["rows"][0]["value"]["rev"];
          console.log(docREV);
        } catch (error) {
          console.log(`Database Updating Error : ${error}`);
        }
        console.log("Done");
      });

      // API - Add tasks
      app.put("/addTasks/:id", async (req, res) => {
        const found = customers.some(idFilter(req));

        if (found) {
          customers.forEach((member, i) => {

            if (idFilter(req)(member)) {

              var updCustomer = member;
              var task0 = { [Object.keys(member.tasks).length + 1]: req.body };

              updCustomer.tasks = JSON.parse(JSON.stringify({ ...member.tasks, ...task0 }));
              // console.log(updCustomer.tasks);
              updCustomer["tasks"] = customers[i]["tasks"];
              customers[i] = updCustomer;
              res.json({ msg: "tasks updated successfully", updCustomer });
            }
          });
        } else {
          return res
            .status(400)
            .json({ msg: `No member with the id of ${req.params.id}` });
        }
        console.log(customers);

        try {
          console.log("Updating on Cloudant...");
          await custo.insert({
            _id: docID,
            _rev: docREV,
            customers,
          });
          console.log(docREV);
          listOfDocs = await custo.list("customers", { include_docs: true });
          docREV = await listOfDocs["rows"][0]["value"]["rev"];
          console.log(docREV);

          console.log("Done");
        } catch (error) {
          console.log(`Database Updating Error : ${error}`);
        }
      });

      // API - Update Member Tasks
      app.put("/customers/:id/:taskid", async (req, res) => {
        const found = customers.some(idFilter(req));
        if (found) {
          customers.forEach((member, i) => {
            if (idFilter(req)(member)) {
              if ((customers[i].tasks[req.params.taskid] === undefined)) {
                res
                  .status(400)
                  .json({ msg: `No task with the id of ${req.params.taskid}` });
              } else {
                customers[i].tasks[req.params.taskid] = req.body;
                res.json({
                  msg: "Task updated",
                  customers,
                });
              }
            }
          });
        } else {
          return res
            .status(400)
            .json({ msg: `No member with the id of ${req.params.id}` });
        }

        // res.redirect('/');
        console.log(customers);

        try {
          console.log("Updating on Cloudant...");
          await custo.insert({
            _id: docID,
            _rev: docREV,
            customers,
          });
          console.log(docREV);
          listOfDocs = await custo.list("customers", { include_docs: true });
          docREV = await listOfDocs["rows"][0]["value"]["rev"];
          console.log(docREV);

          console.log("Done");
        } catch (error) {
          console.log(`Database Updating Error : ${error}`);
        }
      });

      // API - Delete Member Tasks
      app.delete("/customers/:id/:taskid", async (req, res) => {
        const found = customers.some(idFilter(req));
        if (found) {
          customers.forEach((member, i) => {
            if (idFilter(req)(member)) {
              if ((customers[i].tasks[req.params.taskid] === undefined)) {
                res
                  .status(400)
                  .json({ msg: `No task with the id of ${req.params.taskid}` });
              } else {
                delete customers[i].tasks[req.params.taskid]
                res.json({
                  msg: "Task deleted",
                  customers,
                });
              }
            }
          });
        } else {
          res
            .status(400)
            .json({ msg: `No member with the id of ${req.params.id}` });
        }

        console.log("Updating on Cloudant...");
        try {
          await custo.insert({
            _id: docID,
            _rev: docREV,
            customers,
          });

          console.log(docREV);
          listOfDocs = await custo.list("customers", { include_docs: true });
          docREV = await listOfDocs["rows"][0]["value"]["rev"];
          console.log(docREV);
        } catch (error) {
          console.log(`Database Updating Error : ${error}`);
        }
        console.log("Done");
      });
    } catch (error) {
      console.log(`Database Error : ${error}`);
    }
  } catch (error) {
    console.log(`Cloudant Error : ${error}`);
  }
}

const PORT = process.env.PORT || 1234;
app.listen(PORT, () => console.log(`Backend Server started on port ${PORT}`));
