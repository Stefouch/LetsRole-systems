const ATTRIBUTES = ["strength", "agility", "wits", "empathy"];
//const CONDITIONS = ["starving", "dehydrated", "exhausted", "freezing"];
const RESOURCES = ["air", "power", "food", "water"];
const SKILLS = {
    heavymachinery: ATTRIBUTES[0],
    closecombat: ATTRIBUTES[0],
    stamina: ATTRIBUTES[0],
    rangedcombat: ATTRIBUTES[1],
    mobility: ATTRIBUTES[1],
    piloting: ATTRIBUTES[1],
    observation: ATTRIBUTES[2],
    survival: ATTRIBUTES[2],
    comtech: ATTRIBUTES[2],
    command: ATTRIBUTES[3],
    manipulation: ATTRIBUTES[3],
    medicalaid: ATTRIBUTES[3],
};

init = function(sheet) {
    if (sheet.id() === "main") initMain(sheet);
};

function initMain(sheet) {
    each(SKILLS, function(attribute, skill) {
        sheet.get(skill + "_label").on("click", function(event) {
            rollSkillDice(sheet, event);
        });
    });
    each(RESOURCES, function(res) {
        sheet.get(res + "_label").on("click", function(event) {
            rollResourceDice(sheet, event);
        });
    });
}

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
                let str = (stuntCount > 1) ? " Successes" : " Success";
                sheet.get("total").text(stuntCount+str);
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

/*
 * Roll the Skill Dice.
 */
function rollSkillDice(sheet, event) {
    let skillName = event.id().replace("_label", "");
    let baseDiceCount = getSkillDiceCount(sheet, skillName);
    let stress = sheet.get("stress").value();
    
    let diceExpression = "("+baseDiceCount+"d6[base]=6) + ("+stress+"d6[stress]=6)";
    let dice = Dice.create(diceExpression);
    
    let actions = {};
    actions["Push"] = function(dice) {
        let previousStress = sheet.get("stress").value();
        if (previousStress < 10) sheet.get("stress").value(previousStress + 1);
        
        let baseDice = dice.children[0].children[0];
        let stressDice = dice.children[1].children[0];
        
        let newExpression = "("+baseDice.failure+"d6[base]=6) + ("+(stressDice.failure+1)+"d6[stress]=6)";
        let pushedDice = Dice.create(newExpression);
        
        Dice.roll(sheet, pushedDice, skillName+" – Pushed", getVisibility(sheet), actions);
    };
    actions["Panic"] = function(dice) {
        rollPanic(sheet);
    };
    
    Dice.roll(sheet, dice, skillName, getVisibility(sheet), actions);
}
    
function getSkillDiceCount(sheet, skillName) {
    let skill = sheet.get(skillName);
    let attribute = sheet.get(SKILLS[skillName]);
    let diceCount = skill.value() + attribute.value();
    return diceCount;
}

/*
 * Roll the Resource (Consumable) Dice.
 */
function rollResourceDice(sheet, event) {
    let resourceName = event.id().replace("_label", "");
    let resource = sheet.get(resourceName);
    let count = resource.value();
    let rollName = "Consumable: "+resourceName+" × "+count;
    
    let dice = Dice.create(count+"d6")
        .compare(">", 1)
        .tag("resource");
    
    let actions = {};
    actions["Decrease"] = function(dice) {
        let conso = dice.children[0].failure;
        let newQty = count - conso;
        resource.value(newQty);
        
        let title = "Consumable: "+resourceName;
        
        Dice.roll(sheet, newQty, title, getVisibility(sheet));
    };
    
    Dice.roll(sheet, dice, rollName, getVisibility(sheet), actions);
}

/*
 * Get the Modifier with a prompt.
 */
function getModifier() {
    Prompt("Modifiers ?", "prompt_modifier", function(result) {
        return result;
    });
}

function rollPanic(sheet) {
    let stress = sheet.get("stress").value();
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




    
    
    
    


