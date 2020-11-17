/* ===============================================================================
 * ALIEN RPG
 * Official game by Free League Publishing (Fria Ligan): https://www.frialigan.se
 * Official website: https://www.alien-rpg.com
 * ===============================================================================
 * System Version: MU/TH/UR 900 (v0.9)
 * Last Update:    17.11.2020
 * ===============================================================================
 * Contributing:
 * Since Let's-Role doesn't support push request, please use the following
 * Github repository: https://github.com/Stefouch/LetsRole-system-ALIEN-RPG
 * ===============================================================================
 * Creator: Stefouch
 * Patreon: https://www.patreon.com/Stefouch
 * ===============================================================================
 */

const ATTRIBUTES = ["strength", "agility", "wits", "empathy"];
//const CONDITIONS = ["starving", "dehydrated", "exhausted", "freezing"];
const RESOURCES = ["air", "power", "food", "water"];
const SKILLS = {
    heavymachinery: { attribute: ATTRIBUTES[0], name: _("Heavy Machinery") },
    closecombat: { attribute: ATTRIBUTES[0], name: _("Close Combat") },
    stamina: { attribute: ATTRIBUTES[0], name: _("Stamina") },
    rangedcombat: { attribute: ATTRIBUTES[1], name: _("Ranged Combat") },
    mobility: { attribute: ATTRIBUTES[1], name: _("Mobility") },
    piloting: { attribute: ATTRIBUTES[1], name: _("Piloting") },
    observation: { attribute: ATTRIBUTES[2], name: _("Observation") },
    survival: { attribute: ATTRIBUTES[2], name: _("Survival") },
    comtech: { attribute: ATTRIBUTES[2], name: _("Comtech") },
    command: { attribute: ATTRIBUTES[3], name: _("Command") },
    manipulation: { attribute: ATTRIBUTES[3], name: _("Manipulation") },
    medicalaid: { attribute: ATTRIBUTES[3], name: _("Medical Aid") },
};

init = function(sheet) {
    if (sheet.id() === "main") initMain(sheet);
    if (sheet.id() === "monster") initMonster(sheet);
    if (sheet.id() === "prompt_modifier") initPromptModifier(sheet);
};

/**
 * MAIN CHARACTER INITIALIZATION
 */
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

function initButtons(sheet) {
    // Generic Buttons Under the Avatar
    sheet.get("btn_panic").on("click", function() {
        rollPanic(sheet);
    });
    sheet.get("btn_baseroll").on("click", function() {
        rollDice(sheet, 0, 0, "Generic");
    });
    sheet.get("btn_stressroll").on("click", function() {
        let stress = sheet.get("stress").value();
        rollDice(sheet, 0, stress, "Stress");
    });
    sheet.get("btn_armor").on("click", function() {
        let armor = sheet.get("armor").value();
        sheet.prompt("Armor", "prompt_modifier", function(result) {
            let modifier = result.modifier ? result.modifier : 0;
            let diceQty = armor + modifier;
            let diceExp = diceQty + "d6[armor]>=6";
            Dice.roll(sheet, diceExp, "Armor", getVisibility(sheet), null);
        });
    });
    // Health Plus-Minus Buttons
    sheet.get("btn_hp_plus").on("click", function() {
        let hpInput = sheet.get("hp");
        let hp = hpInput.value();
        //let hpMax = getMaxHP(sheet);
        //if (hp < hpMax)
        hpInput.value(hp + 1);
    });
    sheet.get("btn_hp_minus").on("click", function() {
        let hpInput = sheet.get("hp");
        let hp = hpInput.value();
        if (hp > 0) hpInput.value(hp - 1);
    });
    // Stress Plus-Minus Buttons
    sheet.get("btn_stress_plus").on("click", function() {
        let stressInput = sheet.get("stress");
        let stress = stressInput.value();
        if (stress < 10) stressInput.value(stress + 1);
    });
    sheet.get("btn_stress_minus").on("click", function() {
        let stressInput = sheet.get("stress");
        let stress = stressInput.value();
        if (stress > 0) stressInput.value(stress - 1);
    });
    // Armor Plus-Minus Buttons
    sheet.get("btn_armor_plus").on("click", function() {
        let armorInput = sheet.get("armor");
        let armor = armorInput.value();
        armorInput.value(armor + 1);
    });
    sheet.get("btn_armor_minus").on("click", function() {
        let armorInput = sheet.get("armor");
        let armor = armorInput.value();
        if (armor > 0) armorInput.value(armor - 1);
    });
}

function initWeapons(sheet) {
    sheet.get("wpn_unarmed").on("click", function() {
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
    /* Unused Yet
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
    });//*/
}

/**
 * MONSTER (CRAFT) INITIALIZATION
 */
function initMonster(sheet) {
    sheet.setData({ "stress": 0 });
    initMonsterAttacks(sheet);
    initMonsterButtons(sheet);
}

function initMonsterAttacks(sheet) {
    sheet.get("monster_attacks_repeater").on("click", "monster_atk_ref", function(component) {
        let attacks = sheet.get("monster_attacks_repeater").value(); // Get all the children of the repeater (the attacks).
        let index = component.index(); // Get the ID of the weapon created.
        let attack = attacks[index]; // Get a specific child of the repeater (the weapon).
        let diceQty = attack.monster_attack_dice
        if (attack.monster_attack_dice > 0) {
            let name = attack.monster_attack_name;
            let title = name + " ("+diceQty+"D)";
            sheet.prompt(title, "prompt_modifier", function(result) {
                let modifier = result.modifier ? result.modifier : 0;
                diceQty += modifier;
                let diceExp = getRollExpression(diceQty, 0);
                let damage = attack.monster_attack_dmg;
                if (damage > 0) title = name + " (💥"+damage+")";
                Dice.roll(sheet, diceExp, title, getVisibility(sheet), null);
            });
        }
    });
}

function initMonsterButtons(sheet) {
    sheet.get("monster_btn_baseroll").on("click", function() {
        rollDice(sheet, 0, 0, "Generic");
    });
    // Health Plus-Minus Buttons
    sheet.get("btn_hp_plus").on("click", function() {
        let hpInput = sheet.get("hp");
        let hp = hpInput.value();
        //let hpMax = getMaxHP(sheet);
        //if (hp < hpMax)
        hpInput.value(hp + 1);
    });
    sheet.get("btn_hp_minus").on("click", function() {
        let hpInput = sheet.get("hp");
        let hp = hpInput.value();
        if (hp > 0) hpInput.value(hp - 1);
    });
    // Armor Plus-Minus Buttons
    sheet.get("btn_armor_plus").on("click", function() {
        let armorInput = sheet.get("armor");
        let armor = armorInput.value();
        armorInput.value(armor + 1);
    });
    sheet.get("btn_armor_minus").on("click", function() {
        let armorInput = sheet.get("armor");
        let armor = armorInput.value();
        if (armor > 0) armorInput.value(armor - 1);
    });
}

/**
 * PROMPT INITIALIZATION
 * The modifier Prompt has a pair of Plus-Minus buttons.
 */
function initPromptModifier(sheet) {
    sheet.get("btn_mod_plus").on("click", function() {
        let modInput = sheet.get("modifier");
        let modifier = modInput.value();
        modInput.value(modifier + 1);
    });
    sheet.get("btn_mod_minus").on("click", function() {
        let modInput = sheet.get("modifier");
        let modifier = modInput.value();
        modInput.value(modifier - 1);
    });
}

// This function is used to modify the Roll result panel.
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

/**
 * Connect attribute bars.
 */
getBarAttributes = function(sheet) {
    if (sheet.id() === "main") {
        return {
            "HP": ["hp", "hp_max"],
            "Stress": ["stress", 10],
            "Armor": ["armor", "armor"]
        };
    }
    if (sheet.id() === "monster") {
        return {
            "HP": ["hp", "hp_max"],
            "Armor": ["armor", "armor"]
        };
    }
    return {};
}

/**
 * Rolls the dice for an attack.
 * @param {Sheet} sheet - The main sheet
 * @param {string} name - The name of the weapon
 * @param {number} bonus - The weapon's bonus
 * @param {number} damage - The weapon's damage
 * @param {string} skill - The skill used by the weapon ("closecombat" or "rangedcombat")
 */
function rollWeapon(sheet, name, bonus, damage, skill) {
    if (!name) name = "Unnamed Weapon";
    let title = name+" (💥"+damage+")";
    let baseDiceCount = getSkillDiceCount(sheet, skill) + bonus;
    let stress = sheet.get("stress").value();
    rollDice(sheet, baseDiceCount, stress, title);
}

/**
 * Rolls the Skill Dice.
 * @param {Sheet} sheet - The main sheet
 * @param {string} skill - The name of the skill used
 */
function rollSkill(sheet, skill) {
    let title = SKILLS[skill].name;
    let baseDiceCount = getSkillDiceCount(sheet, skill);
    let stress = sheet.get("stress").value();
    rollDice(sheet, baseDiceCount, stress, title);
}

/**
 * Rolls ALIEN-RPG dice.
 * @param {Sheet} sheet - The main sheet
 * @param {number} base - The number of Base dice
 * @param {number} stress - The number of Stress dice
 * @param {string} title - The title of the roll (facultative)
 * @prompt
 * @rolls
 */
function rollDice(sheet, base, stress, title) {
    if (!title) title = "Unnamed Roll";
    sheet.prompt(title, "prompt_modifier", function(result) {
        let modifier = result.modifier ? result.modifier : 0;
        let diceExpression = getRollExpression(base + modifier, stress);
        let dice = Dice.create(diceExpression);
        let actions = {};
        if (title) actions = getRollActions(sheet, title);
        Dice.roll(sheet, dice, title, getVisibility(sheet), actions);
    });
}

/**
 * Gets the available roll actions.
 * The roll actions are:
 *  - "Push"
 *  - "Panic"
 * @param {Sheet} sheet - The main sheet
 * @param {string} title - The title of the roll
 * @returns {Object}
 */
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

/**
 * Gets the number of Base dice for a given skill.
 * @param {Sheet} sheet - The main sheet
 * @param {string} skillName - The name of the skill
 *     The function gets the value of the skill and its connected attribute
 * @returns {number} The number of Base dice to roll
 */
function getSkillDiceCount(sheet, skillName) {
    let skill = sheet.get(skillName);
    let attribute = sheet.get(SKILLS[skillName].attribute);
    return skill.value() + attribute.value();
}

/**
 * Gets the ALIEN-RPG Dice/Roll expression.
 * @param {number} base - The number of Base dice
 * @param {number} stress - The number of Stress dice
 * @returns {string}
 */
function getRollExpression(base, stress) {
    return "("+base+"d6[base]=6) + ("+stress+"d6[stress]=6)";
}

/**
 * Rolls the Resource (Consumable) Dice.
 * @param {Sheet} sheet - The main sheet
 * @param {string} resourceName - The name of the resource (see const RESOURCES above)
 * @rolls
 */
function rollResourceDice(sheet, resourceName) {
    let resource = sheet.get(resourceName);
    let qty = resource.value();
    let count = Math.min(qty, 6); // Maximum 6 resource dice are rolled.
    let rollName = "Consumable: "+resourceName+" × "+qty;
    
    let dice = Dice.create(count+"d6")
        .compare(">", 1)
        .tag("resource");
    
    // Actually, the player has to hit "Decrease" to reduce the consumable quantity.
    // Let's-Role can't do it automatically.
    let actions = {
        "Decrease": function(dice) {
            let conso = dice.children[0].failure;
            let newQty = qty - conso;
            resource.value(newQty);
            let title = "Consumable: "+resourceName;
            Dice.roll(sheet, newQty, title, getVisibility(sheet));
        },
    };
    Dice.roll(sheet, dice, rollName, getVisibility(sheet), actions);
}

/**
 * Updates the Health Points.
 * @param {Sheet} sheet - The main sheet
 */
function updateHP(sheet) {
    let hpMax = getMaxHP(sheet);
    //let hpInput = sheet.get("hp");
    //let hp = hpInput.value();
    sheet.get("hp_max").text(hpMax);
    //if (hp > hpMax) hpInput.value(hpMax);
}

/**
 * Gets the HP maximum.
 * @param {Sheet} sheet - The main sheet
 * @returns {number}
 */
function getMaxHP(sheet) {
    let isTough = sheet.get("has_talent_tough").value();
    let max = sheet.get("strength").value() + (isTough ? 2 : 0);
    return max;
}

/**
 * Updates the sheet's Encumbrance current and max values.
 * @param {Sheet} sheet - The main sheet
 */
function updateEncumbrance(sheet) {
    let isMule = sheet.get("has_talent_pack_mule").value();
    let max = sheet.get("strength").value() * 2 * (isMule ? 2 : 1);
    let encumbrance = 0.0;
    // Let's-Role NumberInputs don't support float value.
    // We have to use "parseInt( <text> * 100) / 100" from a label to get a two-decimal number.
    
    let weapons = sheet.get("weapons_repeater").value(); // Get the weapons in the repeater.
    each(weapons, function(weapon) {
        let weight = convertTextToFloat(weapon.weapon_weight, 3);
        if (weight) {
            encumbrance += weight;
        }
    });
    
    let items = sheet.get("items_repeater").value(); // Get the items in the repeater.
    each(items, function(item) {
        let weight = convertTextToFloat(item.item_weight, 2);
        let count = item.item_count;
        if (weight) {
            if (count) weight = count * weight;
            encumbrance += weight;
        }
    });
    
    // Food & Water have also a weight. 4 units equal to 1 encumbrance.
    let food = sheet.get("food").value() * 0.25;
    let water = sheet.get("water").value() * 0.25;
    encumbrance += food + water;
    
    // Updates the Encumbrance text.
    sheet.get("encumbrance").text(encumbrance+" / "+max);
    
    // Some extra colorization effects.
    if (encumbrance > max) {
        sheet.get("encumbrance").removeClass("text-success");
        sheet.get("encumbrance").addClass("text-danger");
    }
    else {
        sheet.get("encumbrance").removeClass("text-danger");
        sheet.get("encumbrance").addClass("text-success");
    }
}

/**
 * Performs a Panic roll.
 * @param {Sheet} sheet - The main sheet
 * @rolls
 */
function rollPanic(sheet) {
    let isSteel = sheet.get("has_talent_nerves_of_steel").value();
    let stress = sheet.get("stress").value() + (isSteel ? -2 : 0);
    let panicExpression = "1d6+"+stress+"[panic]";
    Dice.roll(sheet, panicExpression, "Panic Roll", getVisibility(sheet));
}

/**
 * Converts a stringy-number into a decimal.
 * @param {string} text - Text to decypher
 * @param {number} decimal - Number of digits after the decimal point
 * @returns {float}
 */
function convertTextToFloat(text, decimal) {
    let str = (text+"").replace(",", "."); // Ensures it's a string and converts French decimals into English system.
    // Removed the Math.pow function for faster calculation.
    // We don't use more than 2 digits so default is 100.
    //let m = Math.pow(10, decimal);
    let m = 100;
    return parseInt(str * m) / m;
}

/**
 * Counts how many values[x] equals to nb.
 * @param {Array<number>} values - An array of numbers with all the dice values
 * @param {number} nb - The value that is counted
 * @returns {number}
 */
function countYZfig(values, nb) {
    let count = 0;
    each(values, function(val) {
        // For the Year Zero Engine, only the 1s and 6s matter.
        if (nb <= 1) {
            if (val <= nb) count++;
        }
        else if (nb >= 6) {
            if (val >= nb) count++;
        }
    });
    return count;
}

/**
 * Gets the option for the roll visibility.
 * Options are: "all", "gm", "gmonly"
 * @param {Sheet} sheet - The main sheet
 * @returns {string}
 */
function getVisibility(sheet) {
    //let opts = ["all", "gm", "gmonly"];
    let visibility = sheet.get("roll_visibility").value();
    if (visibility) return visibility;
    else return "all";
}









