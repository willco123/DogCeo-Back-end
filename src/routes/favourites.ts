import express from "express";
const router = express.Router();
import { saveDogToDB, getDogByUrlDB } from "../models/dog";
import {
  saveFavouriteToDB,
  getFavourites,
  deleteFavouriteDog,
} from "../models/favourite";
import { TokenContents } from "./types";
import passport from "passport";
import jwt from "jsonwebtoken";

const passportMiddleware = passport.authenticate("jwt", { session: false });
const mySecret = process.env.JWT_SECRET!;

router.get(
  "/",
  [passportMiddleware],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const userJWT = jwt.verify(req.cookies["jwt"], mySecret) as TokenContents;

      const userObjectId = userJWT.userPayload;
      const myFavourites = await getFavourites(userObjectId);
      if (myFavourites == null)
        return res.status(404).send("No favourites found!");

      const outputArray = myFavourites.map(({ url, breed, rating }) => ({
        url,
        breed,
        rating,
      }));
      return res.send(outputArray);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/",
  [passportMiddleware],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const dog = req.body;
      const url = dog.url;

      let dogFromDB = await getDogByUrlDB(url);
      if (!dogFromDB) dogFromDB = await saveDogToDB(dog);
      const myDogObjectId = dogFromDB._id;

      const userJWT = jwt.verify(req.cookies["jwt"], mySecret) as TokenContents;
      const userObjectId = userJWT.userPayload;

      await saveFavouriteToDB(userObjectId, myDogObjectId);
      return res.send("Item added to favorites");
    } catch (err: any) {
      if (err.code === 11000) return res.send("Error: Duplicate Key");
      next(err);
    }
  },
);

router.delete(
  "/",
  [passportMiddleware],
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const userJWT = jwt.verify(req.cookies["jwt"], mySecret) as TokenContents;
      const userObjectId = userJWT.userPayload;
      const dog = req.body;

      let dogFromDB = await getDogByUrlDB(dog);
      if (!dogFromDB) dogFromDB = await saveDogToDB(dog);
      const myDogObjectId = dogFromDB._id;

      await deleteFavouriteDog(userObjectId, myDogObjectId);
      return res.send("Dog Deleted");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
