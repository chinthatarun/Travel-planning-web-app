require('dotenv').config(); // ✅ Load environment variables at the very top

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRoute = require("./routes/listingRoutes.js");
const reviewRoute = require("./routes/reviewsRoutes.js");
const userRoute = require("./routes/userRoutes.js");

// ✅ Load MongoDB URL from .env
const dbURL = process.env.ATLAS_DB_URL;
console.log("DB URL loaded from .env is:", dbURL); // Debug print

// View engine & middlewares
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

// ✅ Mongo session store
const store = MongoStore.create({
    mongoUrl: dbURL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 60 * 60,
});

store.on("error", function (err) {
    console.log("ERROR in MONGO SESSION STORE", err);
});

// ✅ Session config
const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));
app.use(flash());

// ✅ Passport config
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ✅ Flash middleware
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.curUser = req.user;
    next();
});

// ✅ MongoDB connection
main().then(() => {
    console.log("✅ Connected to MongoDB Atlas");
}).catch((err) => {
    console.log("❌ MongoDB connection error:", err);
});

async function main() {
    await mongoose.connect(dbURL);
}

// ✅ Routes
app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingRoute);
app.use("/listings/:id/reviews", reviewRoute);
app.use("/", userRoute);

// ✅ 404 handler
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// ✅ Global error handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode).render("listings/error.ejs", { err });
});

// ✅ Start server
app.listen(3000, () => {
    console.log("🚀 Server is listening on port 3000...");
});
