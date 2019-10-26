var roleWorker = require('role.worker');

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
    roleWorker.spawn();

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        switch (creep.memory.role) {
            case 'worker':
                if (!creep.memory.action) {
                    roleWorker.findWork(creep);
                }

                if (creep.memory.action) {
                    roleWorker.doWork(creep);
                }
                break;
        }
    }
}