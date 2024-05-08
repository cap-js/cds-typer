/* eslint-disable @stylistic/js/indent */
const cds = require('@sap/cds')
const { fs, path } = cds.utils
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const { readdir, stat } = require('fs/promises')

// requires @sap/cds-dk version >= 7.5.0
cds.build?.register?.('typer', class TyperBuildPlugin extends cds.build.Plugin {
  static taskDefaults = { src: '.' }
  static hasTask() { return fs.existsSync('tsconfig.json') }

  init() {
    // different from the default build output structure
    this.task.dest = path.join(cds.root, cds.env.build.target !== '.' ? cds.env.build.target : 'gen', 'typer')
  }

  async build() {
    const rmTsFiles = async dir => Promise.all(
      (await readdir(dir))
        .map(async file => {
          const filePath = path.join(dir, file)
          if ((await stat(filePath)).isDirectory()) {
            rmTsFiles(filePath)
          } else if (file.endsWith('.ts')) {
            fs.unlinkSync(filePath)
          }
        })
    )

    const buildDirCdsModels = path.join(this.task.dest, '@cds-models')
    await exec(`tsc --outDir ${this.task.dest}`)
    await this.copy('@cds-models').to(buildDirCdsModels)
    rmTsFiles(buildDirCdsModels)
  }
})