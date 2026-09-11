const fs = require('fs');
const file = '/Users/danielarana/Desktop/cityguide/src/components/loyalty/LoyaltyDesigner.jsx';
let content = fs.readFileSync(file, 'utf8');

const endTargetStr = `      </div>
    </div>
  );
}`;

const endReplacement = `        </div>
      )}
    </div>
  );
}`;

content = content.replace(endTargetStr, endReplacement);
fs.writeFileSync(file, content);
