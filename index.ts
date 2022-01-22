import {mkdir, readdir, readFile} from 'fs/promises';
import {join} from 'path/posix';
import {parse} from 'yaml';
import sizeOf from 'image-size';
import * as glob from 'fast-glob';
import * as sharp from 'sharp';

import {cartesian, Config, LayerSize, shuffle} from './lib';
const BATCH_SIZE = 100;

async function main() {
  const config = await getConfig();
  await mkdir(config.outputPath, {recursive: true});
  const layerDirs = await getLayerDirectories(config);
  const missingDir = layerDirs.find(layerDir => !config.layerOrder.includes(layerDir));

  if (missingDir) {
    console.error(
      `Cannot find layer directory "${missingDir}"! Check your config.yml file and add the correct directory names in the order that you need.`,
    );

    return;
  }

  const layerImages = await getLayerImages(config);
  const layerSize = await getLayerSize(layerImages);
  const imageCombinations = getImageCombinations(layerImages, config);
  console.log(`Generating ${imageCombinations.length} images...`);
  await generateImages(imageCombinations, layerSize, config);
  console.log('Done.');
}

async function getLayerDirectories(config: Config) {
  const dirent = await readdir(config.layerPath, {withFileTypes: true});

  return dirent.reduce((entries, entry) => {
    if (entry.isDirectory()) {
      entries.push(entry.name);
    }

    return entries;
  }, [] as string[]);
}

async function getConfig() {
  const yml = await readFile('./config.yml', {encoding: 'utf8'});
  return parse(yml) as Config;
}

async function getLayerImages(config: Config) {
  const layerImages = await Promise.all(
    config.layerOrder.map(dir => glob(join(config.layerPath, dir, '**/*.png'))),
  );

  return Promise.all(
    layerImages
      .filter(layer => layer.length > 0)
      .map(layer => Promise.all(layer.map(image => readFile(image)))),
  );
}

async function getLayerSize(layerImages: Buffer[][]) {
  const layerSize = new LayerSize();

  await Promise.all(
    layerImages.map(layer =>
      Promise.all(
        layer.map(async image => {
          const size = sizeOf(image) as LayerSize;

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

function getImageCombinations(layerImages: Buffer[][], config: Config) {
  const imageCombinations = cartesian(...layerImages);

  if (config.randomize) {
    shuffle(imageCombinations);
  }

  return config.outputAmount ? imageCombinations.slice(0, config.outputAmount) : imageCombinations;
}

async function generateImages(
  imageCombinations: Buffer[][],
  layerSize: LayerSize,
  config: Config,
  index = 0,
) {
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
          .toFile(join(config.outputPath, `${i + index + config.countFrom}.png`)),
      ),
    );

    await generateImages(imageCombinations, layerSize, config, index + BATCH_SIZE);
  }
}

main();
