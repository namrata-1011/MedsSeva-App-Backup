import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../src/theme/theme';

import { PremiumTestCard } from '../src/components/PremiumTestCard';
import { PremiumPackageCard } from '../src/components/PremiumPackageCard';
import { PremiumBottomSheet } from '../src/components/PremiumBottomSheet';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../src/services/api';

export default function SearchScreen() {
  const router = useRouter();
  // Fetch dynamic categories and tests from DB
  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: apiService.getAllTests,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: apiService.getAllCategories,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: apiService.getAllPackages,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);

  // Active state applied to dataset computation
  const [filterTestType, setFilterTestType] = useState<'all' | 'packages' | 'profiles'>('all');
  const [filterCollection, setFilterCollection] = useState<'all' | 'home' | 'lab'>('all');

  // Temporary values modified inside sheet, committed only on Apply
  const [tempFilterTestType, setTempFilterTestType] = useState<'all' | 'packages' | 'profiles'>('all');
  const [tempFilterCollection, setTempFilterCollection] = useState<'all' | 'home' | 'lab'>('all');

  // Combine tests and packages with identifying field
  const allItems = [
    ...tests.map((t: any) => ({ ...t, searchItemType: 'test' })),
    ...packages.map((p: any) => ({ ...p, searchItemType: 'package' }))
  ];

  const filteredResults = allItems.filter(item => {
    // 1. Match search queries
    const nameMatches = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatches = ('description' in item && typeof item.description === 'string') 
      ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) 
      : false;
    const categoryName = typeof item.category === 'object' ? item.category.name : item.category;
    const categoryMatches = categoryName ? categoryName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    
    const matchesQuery = nameMatches || descMatches || categoryMatches;

    // 2. Category Chip Restriction
    const catId = item.searchItemType === 'package' ? (item as any).categoryId : (item as any).categoryId;
    const matchesCategory = selectedCategory === 'all' ? true : catId === selectedCategory;

    // 3. Bottom Sheet Test Type logic
    let matchesType = true;
    if (filterTestType === 'packages') {
      matchesType = item.searchItemType === 'package';
    } else if (filterTestType === 'profiles') {
      matchesType = item.searchItemType === 'test' && (
        item.name.toLowerCase().includes('profile') || 
        item.name.toLowerCase().includes('package') || 
        item.name.toLowerCase().includes('care')
      );
    }

    // 4. Collection Method Filter logic
    let matchesCollection = true;
    if (filterCollection === 'home') {
      matchesCollection = item.homeCollection === true;
    }

    return matchesQuery && matchesCategory && matchesType && matchesCollection;
  });

  const renderCategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      <TouchableOpacity 
        style={[styles.chip, selectedCategory === 'all' && styles.activeChip]}
        onPress={() => setSelectedCategory('all')}
      >
        <Text style={[styles.chipText, selectedCategory === 'all' && styles.activeChipText]}>All Tests</Text>
      </TouchableOpacity>
      {categories.map((cat: any) => (
        <TouchableOpacity 
          key={cat.id} 
          style={[styles.chip, selectedCategory === cat.id && styles.activeChip]}
          onPress={() => setSelectedCategory(cat.id)}
        >
          <Text style={[styles.chipText, selectedCategory === cat.id && styles.activeChipText]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Sticky Top Header */}
      <View style={styles.topHeaderBg}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Browse Tests</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textLight} style={{ opacity: 0.7 }} />
            <TextInput
              style={styles.searchText}
              placeholder='Search Tests...'
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.filterBtn} 
            onPress={() => {
              setTempFilterTestType(filterTestType);
              setTempFilterCollection(filterCollection);
              setFilterSheetOpen(true);
            }}
          >
            <MaterialCommunityIcons name="tune" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.chipsContainer}>
        {renderCategoryChips()}
      </View>

      {/* Results List */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsCount}>{filteredResults.length} items available</Text>
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => `${item.id}-${item.searchItemType}`}
          renderItem={({ item }) => {
            if (item.searchItemType === 'package') {
              return (
                <PremiumPackageCard 
                  packageData={item as any} 
                  onPress={() => router.push(`/package/${item.id}`)} 
                />
              );
            }
            return (
              <PremiumTestCard 
                test={item as any} 
                onPress={() => router.push(`/test/${item.id}`)} 
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="flask-empty-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try adjusting your search text or filter options.</Text>
            </View>
          }
        />
      </View>

      {/* Filter Bottom Sheet */}
      <PremiumBottomSheet visible={isFilterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={styles.sheetTitle}>Filter Options</Text>
        
        <Text style={styles.filterSectionTitle}>Test Type</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterChip, tempFilterTestType === 'all' && styles.filterChipActive]}
            onPress={() => setTempFilterTestType('all')}
          >
            <Text style={tempFilterTestType === 'all' ? styles.filterChipTextActive : styles.filterChipText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, tempFilterTestType === 'packages' && styles.filterChipActive]}
            onPress={() => setTempFilterTestType('packages')}
          >
            <Text style={tempFilterTestType === 'packages' ? styles.filterChipTextActive : styles.filterChipText}>Packages</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, tempFilterTestType === 'profiles' && styles.filterChipActive]}
            onPress={() => setTempFilterTestType('profiles')}
          >
            <Text style={tempFilterTestType === 'profiles' ? styles.filterChipTextActive : styles.filterChipText}>Profiles</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.filterSectionTitle}>Collection Method</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterChip, tempFilterCollection === 'home' && styles.filterChipActive]}
            onPress={() => setTempFilterCollection('home')}
          >
            <MaterialCommunityIcons 
              name="home-plus-outline" 
              size={16} 
              color={tempFilterCollection === 'home' ? COLORS.textLight : COLORS.textSecondary} 
            />
            <Text style={[tempFilterCollection === 'home' ? styles.filterChipTextActive : styles.filterChipText, { marginLeft: 4 }]}>
              Home Visit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, tempFilterCollection === 'lab' && styles.filterChipActive]}
            onPress={() => setTempFilterCollection('lab')}
          >
            <MaterialCommunityIcons 
              name="hospital-building" 
              size={16} 
              color={tempFilterCollection === 'lab' ? COLORS.textLight : COLORS.textSecondary} 
            />
            <Text style={[tempFilterCollection === 'lab' ? styles.filterChipTextActive : styles.filterChipText, { marginLeft: 4 }]}>
              Lab Visit
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.applyFilterBtn} 
          onPress={() => {
            setFilterTestType(tempFilterTestType);
            setFilterCollection(tempFilterCollection);
            setFilterSheetOpen(false);
          }}
        >
            <Text style={styles.applyFilterText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeaderBg: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textLight,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  searchText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    paddingVertical: 16,
  },
  chipScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  activeChipText: {
    color: COLORS.textLight,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sheetTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textDark,
    marginBottom: 24,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 10,
    marginBottom: 10,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textDark,
  },
  filterChipTextActive: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  applyFilterBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  applyFilterText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: 'bold',
  }
});
