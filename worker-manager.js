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

    if (!workers || workers.length < 6) {
        var newName = 'Worker' + Game.time;

        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];

            if (spawn.room.energyAvailable > 299) {
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

    if (creep.memory.followUpLocation) {
        var roomPosition = creep.room.getPositionAt(creep.memory.followUpLocation.x, creep.memory.followUpLocation.y);
        var targets = roomPosition.look();

        if (targets.length) {
            targets = _.filter(targets, (target) => {
                return target.structure && target.structure.structureType == creep.memory.followUpType && target.structure.hits == 1;
            });

            if (targets.length) {
                creep.memory.target = targets[0].structure.id;
                creep.memory.action = 'repair';
                return;
            }
        }
    }

    if (creep.room.controller.ticksToDowngrade < 5000) {
        creep.memory.action = 'upgrade';
        return;
    }

    var target = findDamagedStructure(creep.room);

    if (target) {
        creep.memory.target = target;
        creep.memory.action = 'repair';
        return;
    }

    target = findEnergyStore(creep.room);

    if (target) {
        creep.memory.target = target;
        creep.memory.action = 'store';
        return;
    }

    target = findConstructionSite(creep.room);

    if (target) {
        creep.memory.target = target;
        creep.memory.action = 'build';
        return;
    }

    creep.memory.action = 'upgrade';
}

function doWork(creep) {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0 && creep.memory.action != 'harvest') {
        creep.memory.continueAction = creep.memory.action;
        creep.memory.continueTarget = creep.memory.target;
        creep.memory.action = 'harvest';
        creep.memory.target = findSource(creep.room);
    }

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
        if (creep.memory.continueAction && creep.memory.continueTarget) {
            creep.memory.action = creep.memory.continueAction;
            creep.memory.target = creep.memory.continueTarget;
            delete creep.memory.continueAction;
            delete creep.memory.continueTarget;
        }
        else {
            reset(creep);
        }

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

    if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
        target = findEnergyStore(creep.room);

        if (target) {
            creep.memory.target = target.id;
        }
        else {
            reset(creep);
            return;
        }
    }

    var result = creep.transfer(target, RESOURCE_ENERGY);
    handleWorkResult(creep, target, result);
}

function build(creep) {
    if (!creep.memory.target) {
        reset(creep);
        return;
    }

    var target = Game.getObjectById(creep.memory.target);

    if (target && (target.structureType == STRUCTURE_RAMPART || target.structureType == STRUCTURE_WALL) &&
        !creep.memory.followUpLocation) {
        creep.memory.followUpLocation = target.pos;
        creep.memory.followUpType = target.structureType;
    }

    if (!target) {
        if (creep.memory.followUpLocation) {
            delete creep.memory.action;
            delete creep.memory.target;
            return;
        }

        target = findConstructionSite(creep.room);

        if (target) {
            creep.memory.target = target.id;
        }
        else {
            reset(creep);
            return;
        }
    }

    var result = creep.build(target);
    handleWorkResult(creep, target, result);
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

    if (!target ||
        (target.structureType == STRUCTURE_WALL && target.hits > 9000) ||
        (target.structureType == STRUCTURE_RAMPART && target.hits > 9000) ||
        target.hits == target.hitsMax) {

        target = findDamagedStructure(creep.room);

        if (target) {
            creep.memory.target = target.id;
        }
        else {
            reset(creep);
            return;
        }
    }

    var result = creep.repair(target);
    handleWorkResult(creep, target, result);
}

function findSource(room) {
    var targets = room.find(FIND_SOURCES, {
        filter: (source) => {
            return source.energy > 0;
        }
    });

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        return targets[index];
    }
}

function findEnergyStore(room) {
    var targets = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
    });

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        return targets[index];
    }
}

function findDamagedStructure(room) {
    var targets = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType == STRUCTURE_WALL ||
                structure.structureType == STRUCTURE_RAMPART) {
                return structure.hits < 5000;
            }

            return structure.hits < structure.hitsMax * 0.5;
        }
    });

    if (targets.length > 0) {
        _.sortBy(targets, 'hits');
        return targets[0];
    }
}

function findConstructionSite(room) {
    var targets = room.find(FIND_CONSTRUCTION_SITES);

    if (targets.length > 0) {
        var index = Math.floor(Math.random() * Math.floor(targets.length));
        return targets[index];
    }
}

function findPath(creep, target) {
    do {
        var path = creep.room.findPath(creep.pos, target.pos, { serialize: true });
        creep.memory.targetPath = path;
    } while (!path);
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
            // if (!creep.memory.targetPath) {
            //     findPath(creep, target);
            // }

            // var result = creep.moveByPath(creep.memory.targetPath);
            // creep.say(result);
            // break;
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

    if (creep.memory.continueAction) {
        delete creep.memory.continueAction;
    }

    if (creep.memory.continueTarget) {
        delete creep.memory.continueTarget;
    }

    if (creep.memory.targetPath) {
        delete creep.memory.targetPath;
    }

    return OK;
}