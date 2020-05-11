const ATTRIBUTES = ["strength", "agility", "wits", "empathy"];
//const CONDITIONS = ["starving", "dehydrated", "exhausted", "freezing"];
const RESOURCES = ["air", "power", "food", "water"];
const SKILLS = {
    heavymachinery: { attribute: ATTRIBUTES[0], name: "Heavy Machinery" },
    closecombat: { attribute: ATTRIBUTES[0], name: "Close Combat" },
    stamina: { attribute: ATTRIBUTES[0], name: "Stamina" },
    rangedcombat: { attribute: ATTRIBUTES[1], name: "Ranged Combat" },
    mobility: { attribute: ATTRIBUTES[1], name: "Mobility" },
    piloting: { attribute: ATTRIBUTES[1], name: "Piloting" },
    observation: { attribute: ATTRIBUTES[2], name: "Observation" },
    survival: { attribute: ATTRIBUTES[2], name: "Survival" },
    comtech: { attribute: ATTRIBUTES[2], name: "Comtech" },
    command: { attribute: ATTRIBUTES[3], name: "Command" },
    manipulation: { attribute: ATTRIBUTES[3], name: "Manipulation" },
    medicalaid: { attribute: ATTRIBUTES[3], name: "Medical Aid" },
};

init = function(sheet) {
    if (sheet.id() === "main") initMain(sheet);
};

function initMain(sheet) {
    initButtons(sheet);
    initWeapons(sheet);
    updateHP(sheet);
    updateEncumbrance(sheet);
    
    each(SKILLS, function(data, skill) {
        sheet.get(skill+"_label").on("click", function(event) {
            let skillName = event.id().replace("_label", "");
            rollSkill(sheet, skillName);
        });
    });
    each(RESOURCES, function(res) {
        sheet.get(res+"_label").on("click", function(event) {
            let resourceName = event.id().replace("_label", "");
            rollResourceDice(sheet, resourceName);
        });
    });
    sheet.get("weapons_repeater").on("update", function() {
        updateEncumbrance(sheet);
    });
    sheet.get("items_repeater").on("update", function() {
        updateEncumbrance(sheet);
    });
    sheet.get("has_talent_pack_mule").on("update", function() {
        updateEncumbrance(sheet);
    });
    sheet.get("has_talent_tough").on("update", function() {
        updateHP(sheet);
    });
    sheet.get("strength").on("update", function() {
        updateHP(sheet);
    });
    sheet.get("food").on("update", function() {
        updateEncumbrance(sheet);
    });
    sheet.get("water").on("update", function() {
        updateEncumbrance(sheet);
    });
}

/*
 * This function is used to modify the Roll result panel.
 */
initRoll = function(result, callback) {
    callback("dice_result_view", function(sheet) {
        let stuntCount = 0;
        let baneCount = 0;
        let panicCount = 0;
        
        if (result.containsTag("base")) {
            let baseDice = result.children[0].children[0];
            let stressDice = result.children[1].children[0];
            let baseDiceValues = baseDice.left.values;
            let stressDiceValues = stressDice.left.values;
            stuntCount = countYZfig(baseDiceValues, 6) + countYZfig(stressDiceValues, 6);
            panicCount = countYZfig(stressDiceValues, 1);
            
            sheet.get("total_base").text("🎲".repeat(baseDiceValues.length));
            sheet.get("total_stress").text("🎲".repeat(stressDiceValues.length));
            
            if (panicCount) {
                sheet.get("total").text("!!! PANIC !!!");
                sheet.get("total").addClass("bg-warning");
                sheet.get("total").addClass("text-dark");
            }
            else if (stuntCount) {
                let str = (stuntCount > 1) ? "Successes" : "Success";
                sheet.get("total").text(stuntCount+" "+str);
                sheet.get("total").addClass("bg-success");
            }
            else {
                sheet.get("total").text("Roll Failed");
                sheet.get("total").addClass("bg-danger");
            }
        }
        else if (result.containsTag("resource")) {
            let diceValues = result.children[0].left.values;
            
            baneCount = countYZfig(diceValues, 1);
            
            if (baneCount >= diceValues.length) {
                sheet.get("total").text("Depleted");
                sheet.get("total").addClass("bg-danger");
            }
            else if (baneCount > 0) {
                sheet.get("total").text("Decreased by "+baneCount);
                sheet.get("total").addClass("bg-warning");
                sheet.get("total").addClass("text-dark");
            }
            else {
                sheet.get("total").text("No Change");
                sheet.get("total").addClass("highlight-1");
            }
            sheet.get("total_base").hide();
            sheet.get("total_stress").hide();
        }
        // Default or Initiative Roll.
        else {
            sheet.get("total").text(result.total);
            sheet.get("total_base").hide();
            sheet.get("total_stress").hide();

            if (result.containsTag("initiative")) {
                sheet.get("total").addClass("text-info");
            }
        }
    });
};

function initButtons(sheet) {
    sheet.get("btn_panic").on("click", function(event) {
        rollPanic(sheet);
    });
    sheet.get("btn_baseroll").on("click", function(event) {
        rollDice(sheet, 0, 0, "Generic");
    });
    sheet.get("btn_stressroll").on("click", function(event) {
        let stress = sheet.get("stress").value();
        rollDice(sheet, 0, stress, "Stress");
    });
}

function initWeapons(sheet) {
    sheet.get("wpn_unarmed").on("click", function(event) {
        rollWeapon(sheet, "Unarmed", 0, 1, "closecombat");
    });
    sheet.get("weapons_repeater").on("click", "wpn_name", function(component) {
        let weapons = sheet.get("weapons_repeater").value(); // Get all the children of the repeater (the weapons).
        let index = component.index(); // Get the ID of the weapon created.
        let weapon = weapons[index]; // Get a specific child of the repeater (the weapon).
        let name = weapon.weapon_name;
        let bonus = weapon.weapon_bonus;
        let damage = weapon.weapon_damage;
        let skill = weapon.weapon_skill_used+"combat"; // will either be closecombat or rangedcombat.
        
        rollWeapon(sheet, name, bonus, damage, skill);
    });
    sheet.get("weapons_repeater").on("click", "wpn_power", function(component) {
        let weapons = sheet.get("weapons_repeater").value();
        let index = component.index();
        let weapon = weapons[index];
        let isPowered = weapon.weapon_is_powered;
        if (isPowered) {
            let power = weapon.weapon_power;
            if (power) {
                log("power: "+power);
            }
        }
    });
}

function rollWeapon(sheet, name, bonus, damage, skill) {
    if (!name) name = "Unnamed Weapon";
    let title = name+" (💥"+damage+")";
    let baseDiceCount = getSkillDiceCount(sheet, skill) + bonus;
    let stress = sheet.get("stress").value();
    rollDice(sheet, baseDiceCount, stress, title);
}

/*
 * Roll the Skill Dice.
 */
function rollSkill(sheet, skill) {
    let title = SKILLS[skill].name;
    let baseDiceCount = getSkillDiceCount(sheet, skill);
    let stress = sheet.get("stress").value();
    rollDice(sheet, baseDiceCount, stress, title);
}

function rollDice(sheet, base, stress, title) {
    if (!title) title = "Unnamed Roll";
    Prompt(title, "prompt_modifier", function(result) {
        let modifier = result.modifier ? result.modifier : 0;
        let diceExpression = getRollExpression(base + modifier, stress);
        let dice = Dice.create(diceExpression);
        let actions = {};
        if (title) actions = getRollActions(sheet, title);
        Dice.roll(sheet, dice, title, getVisibility(sheet), actions);
    });
}

function getRollActions(sheet, title) {
    let actions = {};
    actions["Push"] = function(dice) {
        let previousStress = sheet.get("stress").value();
        if (previousStress < 10) sheet.get("stress").value(previousStress + 1);
        
        let baseDice = dice.children[0].children[0];
        let stressDice = dice.children[1].children[0];
        
        let newExpression = getRollExpression(baseDice.failure, stressDice.failure + 1);
        let pushedDice = Dice.create(newExpression);
        
        Dice.roll(sheet, pushedDice, title+" – Pushed", getVisibility(sheet), actions);
    };
    actions["Panic"] = function(dice) {
        rollPanic(sheet);
    };
    
    return actions;
}
    
function getSkillDiceCount(sheet, skillName) {
    let skill = sheet.get(skillName);
    let attribute = sheet.get(SKILLS[skillName].attribute);
    return skill.value() + attribute.value();
}

function getRollExpression(base, stress) {
    return "("+base+"d6[base]=6) + ("+stress+"d6[stress]=6)";
}

/*
 * Roll the Resource (Consumable) Dice.
 */
function rollResourceDice(sheet, resourceName) {
    let resource = sheet.get(resourceName);
    let count = resource.value();
    let rollName = "Consumable: "+resourceName+" × "+count;
    
    let dice = Dice.create(count+"d6")
        .compare(">", 1)
        .tag("resource");
    
    let actions = {
        "Decrease": function(dice) {
            let conso = dice.children[0].failure;
            let newQty = count - conso;
            resource.value(newQty);
            let title = "Consumable: "+resourceName;
            Dice.roll(sheet, newQty, title, getVisibility(sheet));
        },
    };
    Dice.roll(sheet, dice, rollName, getVisibility(sheet), actions);
}

function updateHP(sheet) {
    let isTough = sheet.get("has_talent_tough").value();
    let max = sheet.get("strength").value() + (isTough ? 2 : 0);
    sheet.get("hp_max").text(max);
}

/*
 * Update the Encumbrance current and max value.
 */
function updateEncumbrance(sheet) {
    let isMule = sheet.get("has_talent_pack_mule").value();
    let max = sheet.get("strength").value() * 2 * (isMule ? 2 : 1);
    let encumbrance = 0.0;
    
    let weapons = sheet.get("weapons_repeater").value(); // Get the weapons in the repeater.
    each(weapons, function(weapon) {
        let weight = parseInt(weapon.weapon_weight*100)/100;
        if (weight) {
            encumbrance += weight;
        }
    });
    
    let items = sheet.get("items_repeater").value(); // Get the items in the repeater.
    each(items, function(item) {
        let weight = parseInt(item.item_weight*100)/100;
        let count = item.item_count;
        if (weight) {
            if (count) weight = count * weight;
            encumbrance += weight;
        }
    });
    
    let food = sheet.get("food").value() * 0.25;
    let water = sheet.get("water").value() * 0.25;
    encumbrance += food + water;
    
    sheet.get("encumbrance").text(encumbrance+" / "+max);
    
    // Colorization
    if (encumbrance > max) {
        sheet.get("encumbrance").removeClass("text-success");
        sheet.get("encumbrance").addClass("text-danger");
    }
    else {
        sheet.get("encumbrance").removeClass("text-danger");
        sheet.get("encumbrance").addClass("text-success");
    }
}

function rollPanic(sheet) {
    let isSteel = sheet.get("has_talent_nerves_of_steel").value();
    let stress = sheet.get("stress").value() + (isSteel ? -2 : 0);
    let panicExpression = "1d6+"+stress+"[panic]";
    Dice.roll(sheet, panicExpression, "Panic Roll", getVisibility(sheet));
}

/*
 * Count how many values[x] equals to nb.
 * For Year Zero Engine, only 1s and 6s matter.
 */
function countYZfig(values, nb) {
    let count = 0;
    each(values, function(val) {
        if (nb <= 1) {
            if (val <= nb) count++;
        }
        else if (nb >= 6) {
            if (val >= nb) count++;
        }
    });
    return count;
}

/*
 * Get the roll visibility option.
 */
function getVisibility(sheet) {
    return sheet.get("roll_visibility").value();
}













