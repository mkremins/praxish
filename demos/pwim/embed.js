import {pipeline} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1/dist/transformers.min.js";
const extractor = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2");

function dotProduct(vectorA, vectorB) {
  let prod = 0;
  for (let i = 0; i < vectorA.length; i++) {
    prod += vectorA[i] * vectorB[i];
  }
  return prod;
}

function magnitude(vector) {
  return Math.sqrt(dotProduct(vector, vector));
}

function cosineSimilarity(vectorA, vectorB) {
  const dotProd = dotProduct(vectorA, vectorB);
  const magnitudeProd = magnitude(vectorA) * magnitude(vectorB);
  return dotProd / magnitudeProd;
}

async function embed(str) {
  return (await extractor(str, {pooling:"mean", normalize:true})).data;
}

// this is gross but necessary if we're mixing module and non-module scripts
// (i.e., exporting functions from this module for use by non-modules)
window.cosineSimilarity = cosineSimilarity;
window.embed = embed;
