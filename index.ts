import {createCanvas, loadImage} from 'canvas';
import _sizeOf from 'image-size';
import {promisify} from 'util';
import {parse} from 'yaml';
import * as glob from 'fast-glob';
import * as fs from 'fs/promises';

import {cartesian} from './lib';

const sizeOf = promisify(_sizeOf);

async function main() {
  const layerDirs = await getLayerDirectories();
  const orderedDirs = await getLayerOrder();
  const missingDir = layerDirs.find(layerDir => !orderedDirs.includes(layerDir));

  if (missingDir) {
    console.error(`Cannot find directory "${missingDir}"!`);
    return;
  }

  const layerImages = await getLayerImages(orderedDirs);
  const layerSize = await getLayerSize(layerImages);
  const imageCombinations = generateImageCombinations(layerImages);

  for (let i = 0; i < imageCombinations.length; i++) {
    const imageCombination = imageCombinations[i];
    const canvas = createCanvas(layerSize.width, layerSize.height);
    const ctx = canvas.getContext('2d');

    for (const imagePath of imageCombination) {
      const image = await loadImage(imagePath);

      ctx.drawImage(
        image,
        (layerSize.width - image.naturalWidth) / 2,
        (layerSize.height - image.naturalHeight) / 2,
      );
    }

    await fs.writeFile(`./output/${i + 1}.png`, canvas.toBuffer());
  }
}

async function getLayerDirectories() {
  const dirent = await fs.readdir('./layers', {withFileTypes: true});

  return dirent.reduce((entries, entry) => {
    if (entry.isDirectory()) {
      entries.push(entry.name);
    }

    return entries;
  }, [] as string[]);
}

async function getLayerOrder() {
  const yml = await fs.readFile('./config.yml', {encoding: 'utf8'});
  const config = parse(yml) as {order: string[]};
  return config.order.map(dir => dir.trim());
}

async function getLayerImages(orderedDirs: string[]) {
  const layerImages = await Promise.all(orderedDirs.map(dir => glob(`./layers/${dir}/**/*.png`)));
  return layerImages.filter(layer => layer.length > 0);
}

async function getLayerSize(layerImages: string[][]) {
  const layerSize = {width: 0, height: 0};

  await Promise.all(
    layerImages.map(layer =>
      Promise.all(
        layer.map(async image => {
          const size = await sizeOf(image);

          if (size && size.width && size.height) {
            if (layerSize.width < size.width) {
              layerSize.width = size.width;
            }

            if (layerSize.height < size.height) {
              layerSize.height = size.height;
            }
          }
        }),
      ),
    ),
  );

  return layerSize;
}

function generateImageCombinations(layerImages: string[][]): string[][] {
  return [...cartesian(...layerImages)];
}

main();
