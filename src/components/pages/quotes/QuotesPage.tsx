import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../molecules/PageHeader';
import { Heading, Text } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { DB, DEFAULT_SETTINGS } from '../../../types/models';
import { parseNumber, fmtUSD } from '../../../lib/utils';

interface QuotesPageProps {
  db: DB;
}

interface QuoteResult {
  productName: string;
  basePrice: number;
  weight: number;
  couponDiscount: number;
  priceAfterCoupon: number;
  tax: number;
  shippingIntl: number;
  unitCostPostShipping: number;
  minimumSellingPrice: number;
  targetRevenue: number;
}

export function QuotesPage({ db }: QuotesPageProps) {
  const { t } = useTranslation();
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [weight, setWeight] = useState<number>(1);
  const [coupon, setCoupon] = useState<number>(0);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);

  const calculateQuote = () => {
    if (!productName.trim()) {
      alert(t('quotes.pleaseEnterProductName'));
      return;
    }

    if (price <= 0) {
      alert(t('quotes.pleaseEnterValidPrice'));
      return;
    }

    const weightCost = db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb;
    const taxRate = db.settings?.taxRatePercent ?? DEFAULT_SETTINGS.taxRatePercent;

    // Apply coupon discount
    const couponDiscount = coupon > 0 ? coupon : 0;
    const priceAfterCoupon = Math.max(0, price - couponDiscount);

    // Calculate tax on discounted price
    const tax = Math.round(priceAfterCoupon * (taxRate / 100) * 100) / 100;

    // Calculate international shipping based on weight
    const shippingIntl = weight * weightCost;

    // Total unit cost post shipping
    const unitCostPostShipping = priceAfterCoupon + tax + shippingIntl;

    // Minimum selling price to ensure $5 revenue
    const targetRevenue = 5.0;
    const minimumSellingPrice = Math.ceil(unitCostPostShipping + targetRevenue);

    setQuoteResult({
      productName: productName.trim(),
      basePrice: price,
      weight,
      couponDiscount,
      priceAfterCoupon,
      tax,
      shippingIntl,
      unitCostPostShipping,
      minimumSellingPrice,
      targetRevenue,
    });
  };

  const clearForm = () => {
    setProductName('');
    setPrice(0);
    setWeight(1);
    setCoupon(0);
    setQuoteResult(null);
  };

  return (
    <div className="page">
      <PageHeader title={t('quotes.title')} />

      <div className="cards">
        <div className="card">
          <div className="card-title">
            <Heading level={3}>{t('quotes.calculateQuote')}</Heading>
          </div>
          <Text variant="muted" className="card-description">
            {t('quotes.description', { amount: fmtUSD(5) })}
          </Text>

          <div className="grid two row-gap">
            <div>
              <label>{t('quotes.productName')}</label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder={t('quotes.enterProductName')}
                data-testid="product-name-input"
              />
            </div>

            <div>
              <label>{t('quotes.price')}</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={price === 0 ? '' : price}
                onChange={e => {
                  const value = e.target.value;
                  setPrice(value === '' ? 0 : parseNumber(value));
                }}
                placeholder="0.00"
                data-testid="price-input"
              />
            </div>

            <div>
              <label>{t('quotes.weight')}</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                inputMode="decimal"
                value={weight}
                onChange={e => {
                  const value = e.target.value;
                  setWeight(value === '' ? 1 : Math.max(0.1, parseNumber(value)));
                }}
                data-testid="weight-input"
              />
              <div className="muted tiny">{t('quotes.defaultWeight')}</div>
            </div>

            <div>
              <label>{t('quotes.couponDiscount')}</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={coupon === 0 ? '' : coupon}
                onChange={e => {
                  const value = e.target.value;
                  setCoupon(value === '' ? 0 : parseNumber(value));
                }}
                placeholder="0.00"
                data-testid="coupon-input"
              />
            </div>
          </div>

          <div className="card-actions" style={{ marginTop: '1.5rem' }}>
            <Button variant="primary" onClick={calculateQuote} data-testid="calculate-btn">
              {t('quotes.calculate')}
            </Button>
            <Button onClick={clearForm} data-testid="clear-btn">
              {t('quotes.clear')}
            </Button>
          </div>
        </div>

        {quoteResult && (
          <div className="card" data-testid="quote-result">
            <div className="card-title">
              <Heading level={3}>{t('quotes.quoteResult')}</Heading>
            </div>
            <div className="card-description">
              <Text>
                <strong>{t('quotes.product')}:</strong> {quoteResult.productName}
              </Text>
            </div>

            <div className="quote-breakdown">
              <div className="breakdown-section">
                <Text variant="small" className="section-title">
                  {t('quotes.costBreakdown')}:
                </Text>
                <div className="breakdown-row">
                  <span>{t('quotes.basePrice')}:</span>
                  <span>{fmtUSD(quoteResult.basePrice)}</span>
                </div>
                {quoteResult.couponDiscount > 0 && (
                  <div className="breakdown-row discount">
                    <span>{t('quotes.couponDiscountLabel')}:</span>
                    <span className="green">-{fmtUSD(quoteResult.couponDiscount)}</span>
                  </div>
                )}
                {quoteResult.couponDiscount > 0 && (
                  <div className="breakdown-row">
                    <span>{t('quotes.priceAfterCoupon')}:</span>
                    <span>{fmtUSD(quoteResult.priceAfterCoupon)}</span>
                  </div>
                )}
                <div className="breakdown-row">
                  <span>
                    {t('quotes.tax', {
                      rate: db.settings?.taxRatePercent ?? DEFAULT_SETTINGS.taxRatePercent,
                    })}
                    :
                  </span>
                  <span>{fmtUSD(quoteResult.tax)}</span>
                </div>
                <div className="breakdown-row">
                  <span>
                    {t('quotes.internationalShipping', {
                      weight: quoteResult.weight,
                      costPerLb: fmtUSD(
                        db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb
                      ),
                    })}
                  </span>
                  <span>{fmtUSD(quoteResult.shippingIntl)}</span>
                </div>
              </div>

              <div className="breakdown-section highlight">
                <div className="breakdown-row total">
                  <span>
                    <strong>{t('quotes.unitCostPostShipping')}:</strong>
                  </span>
                  <span>
                    <strong>{fmtUSD(quoteResult.unitCostPostShipping)}</strong>
                  </span>
                </div>
              </div>

              <div className="breakdown-section success">
                <div className="breakdown-row revenue">
                  <span>{t('quotes.targetRevenue')}:</span>
                  <span className="green">+{fmtUSD(quoteResult.targetRevenue)}</span>
                </div>
                <div className="breakdown-row selling-price">
                  <span>
                    <strong>{t('quotes.minimumSellingPrice')}:</strong>
                  </span>
                  <span className="price-highlight">
                    <strong>{fmtUSD(quoteResult.minimumSellingPrice)}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="info-box" style={{ marginTop: '1rem' }}>
              <Text variant="small" className="info-text">
                {t('quotes.quoteInfo', { amount: fmtUSD(quoteResult.targetRevenue) })}
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
