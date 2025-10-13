export const addDictionary = (label, json) => {
    return {
        type : "ADD_DICO",
        payload : {
            label: label,
            json: json
        }
    };
};

