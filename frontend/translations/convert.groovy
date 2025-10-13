import groovy.json.JsonSlurper;

@Grab(group='com.fasterxml.jackson.core', module='jackson-databind', version='2.15.2')
import com.fasterxml.jackson.databind.ObjectMapper;

def jsonSlurper = new JsonSlurper()

if (args[0].equals("export")) {
	// convert from JSON to TSV

	def enJSON = jsonSlurper.parse(new File("../src/locales/en/translation.json"));
	
	File other = new File("../src/locales/"+args[1]+"/translation.json");
	
	def otherJSON = new HashMap();
	if (other.exists()) otherJSON = jsonSlurper.parse(other);
	
	def enFlat = flattenMap(null,enJSON);
	def otherFlat = flattenMap(null,otherJSON);
	
	System.out.println("key\ten\t"+args[1]);
	
	for (Map.Entry<String,String> entry : enFlat.entrySet()) {
		System.out.println(entry.getKey()+"\t"+entry.getValue()+"\t"+otherFlat.getOrDefault(entry.getKey(),""));
	}	
	
} else  if (args[0].equals("import")) {
	// convert from TSV back to JSON
	
	ObjectMapper mapper = new ObjectMapper();
	
	File tsv = new File(args[2]);
	
	def data = tsv.readLines();
	
	data = data.collect{it.split("\t") as List}
	
	int column = data[0].indexOf(args[1]);
	
	if (column == -1) { 
		System.err.println(args[1] + " is not present in TSV");
		System.exit(1);
	}
	
	Map nested = new LinkedHashMap();
	
	for (int row = 1 ; row < data.size() ; ++row) {
		nest(nested, data[row][0], data[row][column]);
	}
	
	System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(nested));
}

public static Map<String, String> flattenMap(String parentKey, Map<String, Object> nestedMap)
{
    Map<String, String> flatMap = new LinkedHashMap<>();
    String prefixKey = parentKey != null ? parentKey + "." : "";
    for (Map.Entry<String, Object> entry : nestedMap.entrySet()) {
        if (entry.getValue() instanceof String) {
            flatMap.put(prefixKey + entry.getKey(), (String)entry.getValue());
        }
        if (entry.getValue() instanceof Map) {
            flatMap.putAll(flattenMap(prefixKey + entry.getKey(), (Map<String, Object>)entry.getValue()));
        }
    }
    return flatMap;
}

public static Map<String, Object> unflattenMap(Map<String, String> flatMap) {
	Map<String, Object> nestedMap = new LinkedHashMap<>();

	for (Map.Entry<String,String> entry : flatMap.entrySet()) {
		nest(nestedMap,entry.getKey(), entry.getValue());
	}

	return nestedMap;
}

public static void nest(Map nestedMap, String key, String value) {

	// don't add empty values so that we can trigger the i18n fallback to en
	if (value.trim().equals("")) return;

	Map current = nestedMap;

	String[] levels = key.split("\\.");
	for (int l = 0 ; l < levels.length - 1; ++l) {
		Map next = current.get(levels[l]);
		if (next == null) {
			next = new LinkedHashMap<>();
			current.put(levels[l],next);
		}
		current = next;
	}

	current.put(levels[levels.length-1],value);
}
