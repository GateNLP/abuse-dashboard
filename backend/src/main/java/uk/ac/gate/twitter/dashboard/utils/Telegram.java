package uk.ac.gate.twitter.dashboard.utils;

import org.apache.commons.codec.binary.Hex;
import org.springframework.util.Base64Utils;

public class Telegram {

   public static String expandImg(String bytes) throws Exception {
      
      byte[] header = Hex.decodeHex("ffd8ffe000104a4649"+
            "4600010100000100010000ffdb004300281c"+
            "1e231e19282321232d2b28303c64413c3737"+
            "3c7b585d4964918099968f808c8aa0b4e6c3"+
            "a0aadaad8a8cc8ffcbdaeef5ffffff9bc1ff"+
            "fffffaffe6fdfff8ffdb0043012b2d2d3c35"+
            "3c76414176f8a58ca5f8f8f8f8f8f8f8f8f8"+
            "f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8"+
            "f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8"+
            "f8f8f8f8f8ffc00011080000000003012200"+
            "021101031101ffc4001f0000010501010101"+
            "010100000000000000000102030405060708"+
            "090a0bffc400b51000020103030204030505"+
            "04040000017d010203000411051221314106"+
            "13516107227114328191a1082342b1c11552"+
            "d1f02433627282090a161718191a25262728"+
            "292a3435363738393a434445464748494a53"+
            "5455565758595a636465666768696a737475"+
            "767778797a838485868788898a9293949596"+
            "9798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6"+
            "b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6"+
            "d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4"+
            "f5f6f7f8f9faffc4001f0100030101010101"+
            "010101010000000000000102030405060708"+
            "090a0bffc400b51100020102040403040705"+
            "040400010277000102031104052131061241"+
            "510761711322328108144291a1b1c1092333"+
            "52f0156272d10a162434e125f11718191a26"+
            "2728292a35363738393a434445464748494a"+
            "535455565758595a636465666768696a7374"+
            "75767778797a82838485868788898a929394"+
            "95969798999aa2a3a4a5a6a7a8a9aab2b3b4"+
            "b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4"+
            "d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4"+
            "f5f6f7f8f9faffda000c0301000211031100"+
            "3f00");

      byte[] data = Hex.decodeHex(bytes);
      
      byte[] footer = Hex.decodeHex("ffd9");
      
      byte[] result = new byte[header.length+data.length-3+footer.length];
      
      System.arraycopy(header, 0, result, 0, header.length);
      result[164] = data[1];
      result[166] = data[2];
      
      System.arraycopy(data, 3, result, header.length, data.length-3);
      
      System.arraycopy(footer, 0, result, result.length-footer.length, footer.length);
      
      return "data:image/jpeg;base64,"+Base64Utils.encodeToString(result);
   }

}
