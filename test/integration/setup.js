const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const repository = 'https://github.com/SAP-samples/cloud-cap-samples/'
const directory = path.normalize('./test/integration/files/cloud-cap-samples')

module.exports = () => {
    // Jest tried to run the tests included in this repo -> skip for now
    /*
    if (fs.existsSync(directory)) {
        execSync(`git -C ${directory} reset --hard`)
        execSync(`git -C ${directory} pull`)
    } else {
        execSync(`git clone ${repository} ${directory}`)
    }
    */
}
