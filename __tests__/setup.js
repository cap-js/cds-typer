const fs = require('fs')

const execSync = require('child_process').execSync
const repository = 'https://github.com/SAP-samples/cloud-cap-samples/'
const directory = './__tests__/files/cloud-cap-samples'

module.exports = () => {
    if (fs.existsSync(directory)) {
        execSync(`git -C ${directory} reset --hard`)
        execSync(`git -C ${directory} pull`)
    } else {
        execSync(`git clone ${repository} ${directory}`)
    }
}
