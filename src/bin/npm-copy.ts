#!/usr/bin/env node
import { cli } from '../cli';

cli(process.argv.slice(2)).catch(function (error) {
  console.error(error.expected ? error.message : error);
  process.exit(1);
});

