const vscode = require('vscode');
const workflows = require('./src/workflows');

exports.activate = context => {
    const openPR = vscode.commands.registerCommand('extension.openPR', workflows.openPR);
    const viewPR = vscode.commands.registerCommand('extension.viewPR', workflows.viewPR);
    const checkoutPR = vscode.commands.registerCommand('extension.checkoutPR', workflows.checkoutPR);

    context.subscriptions.push(openPR);
    context.subscriptions.push(viewPR);
    context.subscriptions.push(checkoutPR);
};

exports.deactivate = () => {};
