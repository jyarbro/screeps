module.exports = function () {
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
};

function spawn() {
    var workers = _.filter(Game.creeps, (creep) => creep.memory.role == 'worker');

    if (!workers || workers.length < 4) {
        var newName = 'Worker' + Game.time;

        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];

            if (spawn.room.energyAvailable > spawn.room.energyCapacityAvailable * 0.5) {
                var parts = getMaximumParts(spawn);

                if (spawn.spawnCreep(parts), 'test', { dryRun: true }) {
                    spawn.spawnCreep(parts, newName, { memory: { role: 'worker' } });
                }
            }
        }
    }
}

function findWork(creep) {
    if (!creep || creep.ticksToLive < 10 || creep.spawning) {
        return;
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        var target = findSource(creep.room);

        if (target) {
            creep.memory.target = target;
            creep.memory.action = 'harvest';
            return;
        }
    }

    if (creep.room.controller.ticksToDowngrade < 5000) {
        creep.memory.action = 'upgrade';
        return;
    }

    var targets = findDamagedStructures(creep.room);

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        creep.memory.target = targets[index].id;
        creep.memory.action = 'repair';
        return;
    }

    targets = creep.room.find(FIND_CONSTRUCTION_SITES);

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        creep.memory.target = targets[index].id;
        creep.memory.action = 'build';
        return;
    }

    targets = findEnergyStores(creep.room);

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        creep.memory.target = targets[index].id;
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

        case 'repair':
            repair(creep);
            break;

        case 'upgrade':
            upgrade(creep);
            break;
    }
}

function harvest(creep) {
    if (!creep.memory.target) {
        reset(creep);
        return;
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
        reset(creep);
        return;
    }

    var target = Game.getObjectById(creep.memory.target);

    if (!target || target.energy == 0) {
        target = findSource(creep.room);
        
        if (target) {
            creep.memory.target = target.id;
        }
        else {
            reset(creep);
            return;
        }
    }

    var result = creep.harvest(target);
    handleWorkResult(creep, target, result);
}

function store(creep) {
    if (!creep.memory.target) {
        reset(creep);
        return;
    }

    var target = Game.getObjectById(creep.memory.target);

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && target && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        var result = creep.transfer(target, RESOURCE_ENERGY);
        handleWorkResult(creep, target, result);
    }
    else {
        reset(creep);
    }
}

function build(creep) {
    if (!creep.memory.target) {
        reset(creep);
        return;
    }

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        var target = Game.getObjectById(creep.memory.target);
        var result = creep.build(target);
        handleWorkResult(creep, target, result);
    }
    else {
        reset(creep);
    }
}

function upgrade(creep) {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        var result = creep.upgradeController(creep.room.controller);
        handleWorkResult(creep, creep.room.controller, result);
    }
    else {
        reset(creep);
    }
}

function repair(creep) {
    if (!creep.memory.target) {
        reset(creep);
        return;
    }

    var target = Game.getObjectById(creep.memory.target);

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && target.hits < target.hitsMax) {
        var result = creep.repair(target);
        handleWorkResult(creep, target, result);
    }
    else {
        reset(creep);
    }
}

function findSource(room) {
    var targets = room.find(FIND_SOURCES, {
        filter: (source) => {
            return source.energy > 0;
        }
    });

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        return targets[index].id;
    }
}

function findEnergyStores(room) {
    return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
    });
}

function findDamagedStructures(room) {
    return room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return structure.hits < structure.hitsMax * 0.5;
        }
    });
}

function getMaximumParts(spawn) {
    if (spawn.room.energyAvailable > 799) {
        return [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    }

    if (spawn.room.energyAvailable > 699) {
        return [WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    }

    if (spawn.room.energyAvailable > 599) {
        return [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
    }

    if (spawn.room.energyAvailable > 499) {
        return [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
    }

    if (spawn.room.energyAvailable > 399) {
        return [WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
    }

    return [WORK, CARRY, CARRY, CARRY, MOVE];
}

function handleWorkResult(creep, target, result) {
    switch (result) {
        case OK:
            return;

        case ERR_NOT_IN_RANGE:
            return creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });

        case ERR_FULL:
        case ERR_NOT_ENOUGH_RESOURCES:
        case ERR_INVALID_TARGET:
            // TODO: Find another target
            creep.say("Invalid " + result);
            return reset(creep);

        case ERR_NO_BODYPART:
            creep.say("No parts");
            return creep.suicide();

        case ERR_NOT_OWNER:
            creep.say("Not owner");
            delete Memory.creeps[creep.name];
            break;

        default:
            creep.say(result);
    }

    return OK;
}

function reset(creep) {
    if (creep.memory.action) {
        delete creep.memory.action;
    }

    if (creep.memory.target) {
        delete creep.memory.target;
    }

    return OK;
}