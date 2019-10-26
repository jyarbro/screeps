module.exports = {
    doWork: function(creep) {
        switch(creep.memory.action) {
            case 'harvest':
                this.harvest(creep);
                break;

            case 'store':
                this.store(creep);
                break;

            case 'build':
                this.build(creep);
                break;

            case 'upgrade':
                this.upgrade(creep);
                break;
        }
    },

    findWork: function(creep) {
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

        targets = this.findEnergyStorage(creep.room);

        if (targets.length > 0) {
            creep.memory.action = 'store';
            return;
        }

        creep.memory.action = 'upgrade';
    },

    spawn: function() {
        var workers = _.filter(Game.creeps, (creep) => creep.memory.role == 'worker');

        if (!workers || workers.length < 2) {
            var newName = 'Worker' + Game.time;

            for (var spawnName in Game.spawns) {
                var spawn = Game.spawns[spawnName];

                if (spawn.store.getFreeCapacity() == 0) {
                    var parts = this.getMaximumParts(spawn);
                    
                    if (spawn.spawnCreep(parts), 'test', {dryRun: true}) {
                        spawn.spawnCreep(parts, newName, {memory: {role: 'worker'}});
                    }
                }
            }
        }
    },

    harvest(creep) {
        if (creep.store.getFreeCapacity() > 0) {
            var sources = creep.room.find(FIND_SOURCES);
            
            if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        else {
            delete creep.memory.action;
        }
    },

    store(creep) {
        var targets = this.findEnergyStorage(creep.room);

        if (targets.length && creep.store.getUsedCapacity() > 0) {
            if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        else {
            delete creep.memory.action;
        }
    },

    build(creep) {
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        
        if (targets.length && creep.store.getUsedCapacity() > 0) {
            if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        else {
            delete creep.memory.action;
        }
    },

    upgrade(creep) {
        if (creep.store.getUsedCapacity() > 0) {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        else {
            delete creep.memory.action;
        }
    },

    findEnergyStorage(room) {
        return room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
    },

    getMaximumParts(spawn) {
        var capacity = spawn.store.getCapacity(RESOURCE_ENERGY);

        if (capacity > 799) {
            return [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
        }

        if (capacity > 699) {
            return [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
        }

        if (capacity > 599) {
            return [WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
        }

        if (capacity > 499) {
            return [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
        }

        if (capacity > 399) {
            return [WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
        }

        return [WORK, CARRY, CARRY, MOVE, MOVE];
    }
};