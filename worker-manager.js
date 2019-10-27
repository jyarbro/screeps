module.exports = {
    tick: function () {
        spawn();

        for (var name in Game.creeps) {
            var creep = Game.creeps[name];

            if (creep.memory.role == 'worker') {
                if (!creep.memory.action) {
                    findWork(creep);
                }

                if (creep.memory.action) {
                    doWork(creep);
                }
            }
        }
    }
};

function spawn() {
    var workers = _.filter(Game.creeps, (creep) => creep.memory.role == 'worker');

    if (!workers || workers.length < 4) {
        var newName = 'Worker' + Game.time;

        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];

            if (spawn.store.getFreeCapacity() == 0) {
                var parts = getMaximumParts(spawn);

                if (spawn.spawnCreep(parts), 'test', { dryRun: true }) {
                    spawn.spawnCreep(parts, newName, { memory: { role: 'worker' } });
                }
            }
        }
    }
}

function findWork(creep) {
    if (creep.store.getFreeCapacity() > 0) {
        creep.memory.action = 'harvest';
        return;
    }

    if (creep.room.controller.ticksToDowngrade < 5000) {
        creep.memory.action = 'upgrade';
        return;
    }

    var targets = creep.room.find(FIND_CONSTRUCTION_SITES);

    if (targets.length > 0) {
        creep.memory.action = 'build';
        return;
    }

    targets = findEnergyStorage(creep.room);

    if (targets.length > 0) {
        creep.memory.action = 'store';
        return;
    }

    creep.memory.action = 'upgrade';
}

function doWork(creep) {
    switch (creep.memory.action) {
        case 'harvest':
            harvest(creep);
            break;

        case 'store':
            store(creep);
            break;

        case 'build':
            build(creep);
            break;

        case 'upgrade':
            upgrade(creep);
            break;
    }
}

function harvest(creep) {
    if (creep.store.getFreeCapacity() > 0) {
        if (!creep.memory.target) {
            var targets = creep.room.find(FIND_SOURCES);

            if (targets.length > 0) {
                var index = Math.floor(Math.random() * Math.floor(targets.length));
                creep.memory.target = targets[index].id;
            }
        }

        var target = Game.getObjectById(creep.memory.target);

        var result = creep.harvest(target);
        handleResult(creep, target, result);
    }
    else {
        reset(creep);
    }
}

function store(creep) {
    if (creep.store.getUsedCapacity() > 0) {
        if (!creep.memory.target) {
            var targets = findEnergyStorage(creep.room);

            if (targets.length > 0) {
                var index = Math.floor(Math.random() * Math.floor(targets.length));
                creep.memory.target = targets[index].id;
            }
        }

        var target = Game.getObjectById(creep.memory.target);
        var result = creep.transfer(target, RESOURCE_ENERGY);
        handleResult(creep, target, result);
    }
    else {
        reset(creep);
    }
}

function build(creep) {
    if (creep.store.getUsedCapacity() > 0) {
        if (!creep.memory.target) {
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES);

            if (targets.length > 0) {
                var index = Math.floor(Math.random() * Math.floor(targets.length));
                creep.memory.target = targets[index].id;
            }
        }

        var target = Game.getObjectById(creep.memory.target);
        var result = creep.build(target);
        handleResult(creep, target, result);
    }
    else {
        reset(creep);
    }
}

function upgrade(creep) {
    if (creep.store.getUsedCapacity() > 0) {
        var result = creep.upgradeController(creep.room.controller);
        handleResult(creep, creep.room.controller, result);
    }
    else {
        reset(creep);
    }
}

function findEnergyStorage(room) {
    return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
    });
}

function getMaximumParts(spawn) {
    var capacity = spawn.store.getCapacity(RESOURCE_ENERGY);

    if (capacity > 799) {
        return [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE];
    }

    if (capacity > 699) {
        return [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE];
    }

    if (capacity > 599) {
        return [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE];
    }

    if (capacity > 499) {
        return [WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE];
    }

    if (capacity > 399) {
        return [WORK, WORK, CARRY, CARRY, CARRY, MOVE];
    }

    return [WORK, CARRY, CARRY, CARRY, MOVE];
}

function handleResult(creep, target, result) {
    switch (result) {
        case ERR_NOT_IN_RANGE:
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            break;

        case ERR_FULL:
        case ERR_NOT_ENOUGH_RESOURCES:
        case ERR_INVALID_TARGET:
            // TODO: Find another target
            reset(creep);
            break;

        case ERR_NO_BODYPART:
            creep.suicide();
    }
}

function reset(creep) {
    if (creep.memory.action) {
        delete creep.memory.action;
    }

    if (creep.memory.target) {
        delete creep.memory.target;
    }
}