var workerManager = require('worker-manager');

module.exports.loop = function () {
    cleanMemory();
    manageCreeps();
}

function cleanMemory() {
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
}

function manageCreeps() {
    workerManager.spawn();

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        switch (creep.memory.role) {
            case 'worker':
                if (!creep.memory.action) {
                    workerManager.findWork(creep);
                }

                if (creep.memory.action) {
                    workerManager.doWork(creep);
                }
                break;
        }
    }
}