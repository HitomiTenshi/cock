import {mkdir, readdir, readFile} from 'fs/promises';
import _sizeOf from 'image-size';
import {promisify} from 'util';
import {parse} from 'yaml';
import * as glob from 'fast-glob';
import * as sharp from 'sharp';

import {cartesian, LayerSize} from './lib';

const sizeOf = promisify(_sizeOf);
const BATCH_SIZE = 100;

async function main() {
  await mkdir('./output', {recursive: true});
  const layerDirs = await getLayerDirectories();
  const orderedDirs = await getLayerOrder();
  const missingDir = layerDirs.find(layerDir => !orderedDirs.includes(layerDir));

  if (missingDir) {
    console.error(
      `Cannot find layer directory "${missingDir}"! Check your config.yml file and add the correct directory names in the order that you need.`,
    );

    return;
  }

  const layerImages = await getLayerImages(orderedDirs);
  const layerSize = await getLayerSize(layerImages);
  const imageCombinations = cartesian(...layerImages);
  console.log(`Generating ${imageCombinations.length} images...`);
  await generateImages(imageCombinations, layerSize);
  console.log('Done.');
}

async function getLayerDirectories() {
  const dirent = await readdir('./layers', {withFileTypes: true});

  return dirent.reduce((entries, entry) => {
    if (entry.isDirectory()) {
      entries.push(entry.name);
    }

    return entries;
  }, [] as string[]);
}

async function getLayerOrder() {
  const yml = await readFile('./config.yml', {encoding: 'utf8'});
  const config = parse(yml) as {order: string[]};
  return config.order.map(dir => dir.trim());
}

async function getLayerImages(orderedDirs: string[]) {
  const layerImages = await Promise.all(orderedDirs.map(dir => glob(`./layers/${dir}/**/*.png`)));
  return layerImages.filter(layer => layer.length > 0);
}

async function getLayerSize(layerImages: string[][]) {
  const layerSize = new LayerSize();

  await Promise.all(
    layerImages.map(layer =>
      Promise.all(
        layer.map(async image => {
          const size = (await sizeOf(image)) as LayerSize;

          if (layerSize.width < size.width) {
            layerSize.width = size.width;
          }

          if (layerSize.height < size.height) {
            layerSize.height = size.height;
          }
        }),
      ),
    ),
  );

  return layerSize;
}

async function generateImages(imageCombinations: string[][], layerSize: LayerSize, index = 0) {
  const imageCombinationsBatch = imageCombinations.slice(index, index + BATCH_SIZE);

  if (imageCombinationsBatch.length > 0) {
    console.log(`Batch: ${index / BATCH_SIZE + 1} / ${Math.ceil(imageCombinations.length / BATCH_SIZE)}`);

    await Promise.all(
      imageCombinationsBatch.map((imageCombination, i) =>
        sharp({
          create: {
            width: layerSize.width,
            height: layerSize.height,
            channels: 4,
            background: {r: 0, g: 0, b: 0, alpha: 0},
          },
        })
          .composite(imageCombination.map(image => ({input: image})))
          .toFile(`./output/${i + index + 1}.png`),
      ),
    );

    await generateImages(imageCombinations, layerSize, index + BATCH_SIZE);
  }
}

main();
