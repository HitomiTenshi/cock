# Creative Overlay Connecting Kebab (COCK)

This is a spin on https://github.com/HashLips/generative-art-node where instead of generating 5 random images, it generates all possible permutations.

Rewritten from scratch in TypeScript.

Layer images credit goes to: https://github.com/HashLips

## Usage

- `npm install`
- `npm start`

## Configuration

Place your layer images under the `layers` directory.

Modify `config.yml` to add your own layer directories. Make sure that all configured directories in your `layerOrder` exist, otherwise an error will be thrown.

### Options

- `layerPath` The path to your layers directory. (Default: `./layers`)
- `outputPath` The path to your output directory. (Default: `./output`)
- `countFrom` Starts counting generated images from this number. (Default: `1`)
- `outputAmount` The amount of images to generate. (Default: `0`) [Value `0` means no limit]
- `randomize` Randomizes the output. (Default: `false`)
- `layerOrder` The order of your layers.

## Supported File Formats

- png

## The Magic

This app will search through all `png` files in your configured layer directories (including sub-directories) and find the largest width and height of your largest image.

The largest width and height will then be used for all generated images. Any layer image that is smaller than the largest image will be centered.

Each layer that you defined in your `config.yml` is being placed in your order from top to bottom. The topmost layer is the layer that is the farthest in the background and the bottommost layer is the layer that is the farthest in the foreground.
