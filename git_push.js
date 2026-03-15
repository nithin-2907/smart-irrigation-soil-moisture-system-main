const { execSync } = require('child_process');
const fs = require('fs');

const logPath = 'git_log.txt';
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logPath, msg + '\n');
}

try {
    log("Checking status...");
    const status = execSync('git status', { encoding: 'utf8' });
    log(status);

    log("Committing changed files...");
    // -am adds all tracked modified files
    const commit = execSync('git commit -am "Final fix for fieldSize and display fallbacks"', { encoding: 'utf8' });
    log(commit);

    log("Pushing...");
    const push = execSync('git push', { encoding: 'utf8' });
    log(push);
    
    log("Git operations completed successfully.");
} catch (err) {
    log("Error during git operations: " + err.stdout + " " + err.stderr + " " + err.message);
}
