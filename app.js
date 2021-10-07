require("dotenv").config();
const express = require("express");
const app = express();
const userRouter = require("./api/users/user.router");

//convert user input to JSON
app.use(express.json());

app.use("/v1/user", userRouter);

app.listen(process.env.APP_PORT, () => {
  console.log("Server up and running at : ", process.env.APP_PORT);
});
