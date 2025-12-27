from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import json

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'islamic-will-secret-key-2024')

# Database configuration
database_url = os.environ.get('DATABASE_URL', 'sqlite:///islamic_will.db')
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class Testator(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    heirs = db.relationship('Heir', backref='testator', lazy=True, cascade='all, delete-orphan')
    executors = db.relationship('Executor', backref='testator', lazy=True, cascade='all, delete-orphan')
    debtors = db.relationship('Debtor', backref='testator', lazy=True, cascade='all, delete-orphan')
    creditors = db.relationship('Creditor', backref='testator', lazy=True, cascade='all, delete-orphan')
    assets = db.relationship('Asset', backref='testator', lazy=True, cascade='all, delete-orphan')

class Heir(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    testator_id = db.Column(db.Integer, db.ForeignKey('testator.id'), nullable=False)
    relation = db.Column(db.String(50), nullable=False)  # wife, mother, son, daughter
    full_name = db.Column(db.String(200), nullable=False)
    share_type = db.Column(db.String(50))  # fixed or residue

class Executor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    testator_id = db.Column(db.Integer, db.ForeignKey('testator.id'), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    contact = db.Column(db.String(200))

class Debtor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    testator_id = db.Column(db.Integer, db.ForeignKey('testator.id'), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    contact = db.Column(db.String(200))
    reason = db.Column(db.Text)
    amount = db.Column(db.Float, default=0)
    notes = db.Column(db.Text)

class Creditor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    testator_id = db.Column(db.Integer, db.ForeignKey('testator.id'), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    contact = db.Column(db.String(200))
    reason = db.Column(db.Text)
    amount = db.Column(db.Float, default=0)
    notes = db.Column(db.Text)

class Asset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    testator_id = db.Column(db.Integer, db.ForeignKey('testator.id'), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # immovable, movable, other
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(200))
    estimated_value = db.Column(db.Float, default=0)
    notes = db.Column(db.Text)

# Initialize database
with app.app_context():
    db.create_all()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    testator_id = session.get('testator_id')
    testator = None
    if testator_id:
        testator = Testator.query.get(testator_id)
    return render_template('dashboard.html', testator=testator)

@app.route('/will-clause')
def will_clause():
    testator_id = session.get('testator_id')
    if not testator_id:
        return render_template('will_clause.html', testator=None)
    testator = Testator.query.get(testator_id)
    return render_template('will_clause.html', testator=testator)

# API Routes
@app.route('/api/testator', methods=['GET', 'POST', 'PUT'])
def api_testator():
    if request.method == 'GET':
        testator_id = session.get('testator_id')
        if not testator_id:
            return jsonify({'error': 'No testator in session'}), 404
        testator = Testator.query.get(testator_id)
        if not testator:
            return jsonify({'error': 'Testator not found'}), 404
        return jsonify({
            'id': testator.id,
            'full_name': testator.full_name,
            'address': testator.address
        })
    
    elif request.method == 'POST':
        data = request.json
        testator = Testator(
            full_name=data.get('full_name', ''),
            address=data.get('address', '')
        )
        db.session.add(testator)
        db.session.commit()
        session['testator_id'] = testator.id
        return jsonify({'id': testator.id, 'message': 'Testator created'})
    
    elif request.method == 'PUT':
        testator_id = session.get('testator_id')
        if not testator_id:
            return jsonify({'error': 'No testator in session'}), 404
        testator = Testator.query.get(testator_id)
        if not testator:
            return jsonify({'error': 'Testator not found'}), 404
        data = request.json
        testator.full_name = data.get('full_name', testator.full_name)
        testator.address = data.get('address', testator.address)
        db.session.commit()
        return jsonify({'message': 'Testator updated'})

@app.route('/api/heirs', methods=['GET', 'POST'])
def api_heirs():
    testator_id = session.get('testator_id')
    if not testator_id:
        return jsonify({'error': 'No testator in session'}), 404
    
    if request.method == 'GET':
        heirs = Heir.query.filter_by(testator_id=testator_id).all()
        return jsonify([{
            'id': h.id,
            'relation': h.relation,
            'full_name': h.full_name,
            'share_type': h.share_type
        } for h in heirs])
    
    elif request.method == 'POST':
        data = request.json
        heir = Heir(
            testator_id=testator_id,
            relation=data.get('relation', ''),
            full_name=data.get('full_name', ''),
            share_type=data.get('share_type', '')
        )
        db.session.add(heir)
        db.session.commit()
        return jsonify({'id': heir.id, 'message': 'Heir added'})

@app.route('/api/heirs/<int:heir_id>', methods=['PUT', 'DELETE'])
def api_heir(heir_id):
    heir = Heir.query.get_or_404(heir_id)
    
    if request.method == 'PUT':
        data = request.json
        heir.relation = data.get('relation', heir.relation)
        heir.full_name = data.get('full_name', heir.full_name)
        heir.share_type = data.get('share_type', heir.share_type)
        db.session.commit()
        return jsonify({'message': 'Heir updated'})
    
    elif request.method == 'DELETE':
        db.session.delete(heir)
        db.session.commit()
        return jsonify({'message': 'Heir deleted'})

@app.route('/api/executors', methods=['GET', 'POST'])
def api_executors():
    testator_id = session.get('testator_id')
    if not testator_id:
        return jsonify({'error': 'No testator in session'}), 404
    
    if request.method == 'GET':
        executors = Executor.query.filter_by(testator_id=testator_id).all()
        return jsonify([{
            'id': e.id,
            'full_name': e.full_name,
            'contact': e.contact
        } for e in executors])
    
    elif request.method == 'POST':
        data = request.json
        executor = Executor(
            testator_id=testator_id,
            full_name=data.get('full_name', ''),
            contact=data.get('contact', '')
        )
        db.session.add(executor)
        db.session.commit()
        return jsonify({'id': executor.id, 'message': 'Executor added'})

@app.route('/api/executors/<int:executor_id>', methods=['PUT', 'DELETE'])
def api_executor(executor_id):
    executor = Executor.query.get_or_404(executor_id)
    
    if request.method == 'PUT':
        data = request.json
        executor.full_name = data.get('full_name', executor.full_name)
        executor.contact = data.get('contact', executor.contact)
        db.session.commit()
        return jsonify({'message': 'Executor updated'})
    
    elif request.method == 'DELETE':
        db.session.delete(executor)
        db.session.commit()
        return jsonify({'message': 'Executor deleted'})

@app.route('/api/debtors', methods=['GET', 'POST'])
def api_debtors():
    testator_id = session.get('testator_id')
    if not testator_id:
        return jsonify({'error': 'No testator in session'}), 404
    
    if request.method == 'GET':
        debtors = Debtor.query.filter_by(testator_id=testator_id).all()
        return jsonify([{
            'id': d.id,
            'full_name': d.full_name,
            'contact': d.contact,
            'reason': d.reason,
            'amount': d.amount,
            'notes': d.notes
        } for d in debtors])
    
    elif request.method == 'POST':
        data = request.json
        debtor = Debtor(
            testator_id=testator_id,
            full_name=data.get('full_name', ''),
            contact=data.get('contact', ''),
            reason=data.get('reason', ''),
            amount=float(data.get('amount', 0)),
            notes=data.get('notes', '')
        )
        db.session.add(debtor)
        db.session.commit()
        return jsonify({'id': debtor.id, 'message': 'Debtor added'})

@app.route('/api/debtors/<int:debtor_id>', methods=['PUT', 'DELETE'])
def api_debtor(debtor_id):
    debtor = Debtor.query.get_or_404(debtor_id)
    
    if request.method == 'PUT':
        data = request.json
        debtor.full_name = data.get('full_name', debtor.full_name)
        debtor.contact = data.get('contact', debtor.contact)
        debtor.reason = data.get('reason', debtor.reason)
        debtor.amount = float(data.get('amount', debtor.amount))
        debtor.notes = data.get('notes', debtor.notes)
        db.session.commit()
        return jsonify({'message': 'Debtor updated'})
    
    elif request.method == 'DELETE':
        db.session.delete(debtor)
        db.session.commit()
        return jsonify({'message': 'Debtor deleted'})

@app.route('/api/creditors', methods=['GET', 'POST'])
def api_creditors():
    testator_id = session.get('testator_id')
    if not testator_id:
        return jsonify({'error': 'No testator in session'}), 404
    
    if request.method == 'GET':
        creditors = Creditor.query.filter_by(testator_id=testator_id).all()
        return jsonify([{
            'id': c.id,
            'full_name': c.full_name,
            'contact': c.contact,
            'reason': c.reason,
            'amount': c.amount,
            'notes': c.notes
        } for c in creditors])
    
    elif request.method == 'POST':
        data = request.json
        creditor = Creditor(
            testator_id=testator_id,
            full_name=data.get('full_name', ''),
            contact=data.get('contact', ''),
            reason=data.get('reason', ''),
            amount=float(data.get('amount', 0)),
            notes=data.get('notes', '')
        )
        db.session.add(creditor)
        db.session.commit()
        return jsonify({'id': creditor.id, 'message': 'Creditor added'})

@app.route('/api/creditors/<int:creditor_id>', methods=['PUT', 'DELETE'])
def api_creditor(creditor_id):
    creditor = Creditor.query.get_or_404(creditor_id)
    
    if request.method == 'PUT':
        data = request.json
        creditor.full_name = data.get('full_name', creditor.full_name)
        creditor.contact = data.get('contact', creditor.contact)
        creditor.reason = data.get('reason', creditor.reason)
        creditor.amount = float(data.get('amount', creditor.amount))
        creditor.notes = data.get('notes', creditor.notes)
        db.session.commit()
        return jsonify({'message': 'Creditor updated'})
    
    elif request.method == 'DELETE':
        db.session.delete(creditor)
        db.session.commit()
        return jsonify({'message': 'Creditor deleted'})

@app.route('/api/assets', methods=['GET', 'POST'])
def api_assets():
    testator_id = session.get('testator_id')
    if not testator_id:
        return jsonify({'error': 'No testator in session'}), 404
    
    if request.method == 'GET':
        assets = Asset.query.filter_by(testator_id=testator_id).all()
        return jsonify([{
            'id': a.id,
            'category': a.category,
            'description': a.description,
            'location': a.location,
            'estimated_value': a.estimated_value,
            'notes': a.notes
        } for a in assets])
    
    elif request.method == 'POST':
        data = request.json
        asset = Asset(
            testator_id=testator_id,
            category=data.get('category', ''),
            description=data.get('description', ''),
            location=data.get('location', ''),
            estimated_value=float(data.get('estimated_value', 0)),
            notes=data.get('notes', '')
        )
        db.session.add(asset)
        db.session.commit()
        return jsonify({'id': asset.id, 'message': 'Asset added'})

@app.route('/api/assets/<int:asset_id>', methods=['PUT', 'DELETE'])
def api_asset(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    
    if request.method == 'PUT':
        data = request.json
        asset.category = data.get('category', asset.category)
        asset.description = data.get('description', asset.description)
        asset.location = data.get('location', asset.location)
        asset.estimated_value = float(data.get('estimated_value', asset.estimated_value))
        asset.notes = data.get('notes', asset.notes)
        db.session.commit()
        return jsonify({'message': 'Asset updated'})
    
    elif request.method == 'DELETE':
        db.session.delete(asset)
        db.session.commit()
        return jsonify({'message': 'Asset deleted'})

@app.route('/api/summary', methods=['GET'])
def api_summary():
    testator_id = session.get('testator_id')
    if not testator_id:
        return jsonify({'error': 'No testator in session'}), 404
    
    testator = Testator.query.get(testator_id)
    if not testator:
        return jsonify({'error': 'Testator not found'}), 404
    
    # Calculate totals
    total_debtors = sum(d.amount for d in testator.debtors)
    total_creditors = sum(c.amount for c in testator.creditors)
    total_assets = sum(a.estimated_value for a in testator.assets)
    
    # Calculate by asset category
    immovable_assets = sum(a.estimated_value for a in testator.assets if a.category == 'immovable')
    movable_assets = sum(a.estimated_value for a in testator.assets if a.category == 'movable')
    other_assets = sum(a.estimated_value for a in testator.assets if a.category == 'other')
    
    # Net estate calculation
    total_pool = total_assets + total_debtors
    net_estate = total_pool - total_creditors
    
    # Islamic inheritance calculation (for wife, mother, 3 sons, 2 daughters)
    heirs = Heir.query.filter_by(testator_id=testator_id).all()
    inheritance_calc = calculate_islamic_inheritance(net_estate, heirs)
    
    return jsonify({
        'testator': {
            'full_name': testator.full_name,
            'address': testator.address
        },
        'totals': {
            'debtors': total_debtors,
            'creditors': total_creditors,
            'assets': total_assets,
            'immovable_assets': immovable_assets,
            'movable_assets': movable_assets,
            'other_assets': other_assets,
            'total_pool': total_pool,
            'net_estate': net_estate
        },
        'inheritance': inheritance_calc,
        'counts': {
            'heirs': len(testator.heirs),
            'executors': len(testator.executors),
            'debtors': len(testator.debtors),
            'creditors': len(testator.creditors),
            'assets': len(testator.assets)
        }
    })

def calculate_islamic_inheritance(net_estate, heirs):
    """
    Calculate Islamic inheritance shares based on Al-Faraid rules.
    For a father with wife, mother, sons, and daughters.
    """
    if net_estate <= 0:
        return {
            'status': 'insolvent',
            'message': 'Estate is insolvent. No inheritance distribution possible.',
            'shares': []
        }
    
    shares = []
    remaining = net_estate
    
    # Count heirs by type
    wife_count = sum(1 for h in heirs if h.relation == 'wife')
    mother_count = sum(1 for h in heirs if h.relation == 'mother')
    son_count = sum(1 for h in heirs if h.relation == 'son')
    daughter_count = sum(1 for h in heirs if h.relation == 'daughter')
    
    # Wife's share: 1/8 when there are children
    if wife_count > 0:
        has_children = son_count > 0 or daughter_count > 0
        wife_fraction = 1/8 if has_children else 1/4
        wife_share = net_estate * wife_fraction
        for h in heirs:
            if h.relation == 'wife':
                shares.append({
                    'name': h.full_name,
                    'relation': 'Wife',
                    'fraction': f"1/{8 if has_children else 4}",
                    'amount': wife_share / wife_count
                })
        remaining -= wife_share
    
    # Mother's share: 1/6 when there are children
    if mother_count > 0:
        has_children = son_count > 0 or daughter_count > 0
        mother_fraction = 1/6 if has_children else 1/3
        mother_share = net_estate * mother_fraction
        for h in heirs:
            if h.relation == 'mother':
                shares.append({
                    'name': h.full_name,
                    'relation': 'Mother',
                    'fraction': f"1/{6 if has_children else 3}",
                    'amount': mother_share / mother_count
                })
        remaining -= mother_share
    
    # Children share the residue (Asaba)
    # Sons get 2 shares, daughters get 1 share
    if son_count > 0 or daughter_count > 0:
        total_child_shares = (son_count * 2) + daughter_count
        share_unit = remaining / total_child_shares if total_child_shares > 0 else 0
        
        for h in heirs:
            if h.relation == 'son':
                shares.append({
                    'name': h.full_name,
                    'relation': 'Son',
                    'fraction': f"2/{total_child_shares} of residue",
                    'amount': share_unit * 2
                })
            elif h.relation == 'daughter':
                shares.append({
                    'name': h.full_name,
                    'relation': 'Daughter',
                    'fraction': f"1/{total_child_shares} of residue",
                    'amount': share_unit
                })
    
    return {
        'status': 'calculated',
        'net_estate': net_estate,
        'shares': shares
    }

@app.route('/api/load-demo', methods=['POST'])
def load_demo_data():
    """Load demo data for GHOUENZEN SOULEMANOU"""
    # Create testator
    testator = Testator(
        full_name='GHOUENZEN SOULEMANOU',
        address='Mankon-Bamenda, Cameroon'
    )
    db.session.add(testator)
    db.session.commit()
    session['testator_id'] = testator.id
    
    # Add heirs
    heirs_data = [
        {'relation': 'wife', 'full_name': 'GHOUENZEN MEFIRE HAFSETOU', 'share_type': 'fixed'},
        {'relation': 'mother', 'full_name': 'MENJIKOUE ABIBA', 'share_type': 'fixed'},
        {'relation': 'son', 'full_name': 'GHOUENZEN NJOYA MOHAMED HANIF', 'share_type': 'residue'},
        {'relation': 'son', 'full_name': 'GHOUENZEN SALIH NASRI SALIM', 'share_type': 'residue'},
        {'relation': 'son', 'full_name': 'GHOUENZEN NJIKAM MUSTAFA HAKIM', 'share_type': 'residue'},
        {'relation': 'daughter', 'full_name': 'GHOUENZEN HABIBA MARYAM IMANN', 'share_type': 'residue'},
        {'relation': 'daughter', 'full_name': 'GHOUENZEN MEFIRE ZAINAB NOURA', 'share_type': 'residue'},
    ]
    for h in heirs_data:
        heir = Heir(testator_id=testator.id, **h)
        db.session.add(heir)
    
    # Add assets
    assets_data = [
        {'category': 'immovable', 'description': 'Land - 400 m²', 'location': 'Foumban (West Region)', 'estimated_value': 8000000, 'notes': 'Est. @ 20,000 XAF/m²'},
        {'category': 'immovable', 'description': 'Land - 4,000 m²', 'location': 'Ngombe (Littoral Region)', 'estimated_value': 40000000, 'notes': 'Est. @ 10,000 XAF/m²'},
        {'category': 'immovable', 'description': 'Land - 500 m²', 'location': 'Bomono (Littoral Region)', 'estimated_value': 7500000, 'notes': 'Est. @ 15,000 XAF/m²'},
        {'category': 'immovable', 'description': 'Land with Family House - 450 m²', 'location': 'Lendi (Littoral Region)', 'estimated_value': 13500000, 'notes': 'Est. @ 30,000 XAF/m² (with house)'},
        {'category': 'immovable', 'description': 'Land (2nd Plot) - 450 m²', 'location': 'Lendi (Littoral Region)', 'estimated_value': 9000000, 'notes': 'Est. @ 20,000 XAF/m²'},
        {'category': 'immovable', 'description': 'Land - 3,500 m²', 'location': 'Massoumbou (Littoral Region)', 'estimated_value': 24500000, 'notes': 'Est. @ 7,000 XAF/m²'},
        {'category': 'immovable', 'description': 'Farmland - ~5 hectares', 'location': 'Malere (West Region)', 'estimated_value': 25000000, 'notes': 'Est. @ 5M XAF/ha (agricultural)'},
        {'category': 'movable', 'description': 'Vehicle: Nissan X-Trail', 'location': 'Cameroon', 'estimated_value': 0, 'notes': 'Value to be determined'},
        {'category': 'movable', 'description': 'Vehicle: Mitsubishi Single-Cabin Pickup', 'location': 'Cameroon', 'estimated_value': 0, 'notes': 'Value to be determined'},
    ]
    for a in assets_data:
        asset = Asset(testator_id=testator.id, **a)
        db.session.add(asset)
    
    db.session.commit()
    return jsonify({'message': 'Demo data loaded', 'testator_id': testator.id})

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """Clear the current session"""
    session.clear()
    return jsonify({'message': 'Session cleared'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
