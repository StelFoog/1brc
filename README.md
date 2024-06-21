# 1brc

My 10 minute (though multithreaded version took a few hours to debug) attempt at the 1brc using TypeScript + [Bun](https://bun.sh) (_v1.1.14_)

## Generating `measurements.txt`

The one billion row file is ~13GB so not so great to commit. Instead it has to be generated using the official [1brc repo](https://github.com/1brc/bun).

```sh
git clone https://github.com/1brc/bun.git
cd 1brc
# Requires Java 21 to run
./mvnw clean verify
./create_measurements.sh 1000000000
mv measurements.txt ..
cd ..
rm -rf 1brc
```

## Usage

To install dependencies:

```bash
bun install
```

To run:

```bash
bun default
```
