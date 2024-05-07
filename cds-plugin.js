/* eslint-disable @stylistic/js/indent */
const cds = require('@sap/cds')
const { fs, path } = cds.utils
// requires @sap/cds-dk version >= 7.5.0
cds.build?.register?.('typer', class TyperBuildPlugin extends cds.build.Plugin {
  
  static taskDefaults = { src: '.' }
  
  static hasTask() { return fs.existsSync('tsconfig.json') }

  init() {
    // different from the default build output structure
    this.task.dest = path.join(cds.root, cds.env.build.target !== '.' ? cds.env.build.target : 'gen', 'typer')
  }

  async build() {
    const model = await this.model()
    if (!model) return

    const promises = []
    promises.push(this.write(cds.compile.to.json(model)).to('csn.json'))

    if (fs.existsSync(path.join(this.task.src, 'types'))) {
      promises.push(this.copy('types').to('types'))
    }
    return Promise.all(promises)
  }
})