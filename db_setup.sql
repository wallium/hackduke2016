-- Run to set up database


CREATE TABLE Crises
(
  Crisis_name varchar(255)
);

CREATE TABLE Counties
(
  County_name varchar(255),
  Crisis varchar(255),
  Water_needs int,
  Food_needs int,
  Clothing_needs int
);

CREATE TABLE Organizations
(
  Org_name varchar(255),
  Address varchar(255)
);

CREATE TABLE Services
(
  County varchar(255),
  Org varchar(255),
  Resource varchar(255),
  Provided int,
  Received int
);